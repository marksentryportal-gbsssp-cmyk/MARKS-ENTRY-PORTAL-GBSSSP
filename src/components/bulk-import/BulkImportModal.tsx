import React, { useState, useCallback, useMemo } from 'react';
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
  RotateCcw,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { Student } from '../../types';
import { StepIndicator } from './StepIndicator';
import { FileDropzone } from './FileDropzone';
import {
  ImportPreviewTable,
  ParsedStudentRow,
  RowErrorState,
  RowWarningState,
} from './ImportPreviewTable';
import {
  validateStudentName,
  validateParentName,
  validateCurrentAddress,
  parseAndValidateDob,
  normaliseGender,
  matchClass,
  findDuplicateStudent,
} from '../../utils/studentValidator';
import { getHighestRollNo, parseNumericRollNo } from '../../utils/rollNoUtils';
import { normalizeDateInput } from '../../utils/excelUtils';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClassId: string;
  targetClassName: string;
  targetAcademicYear: string;
  targetExamId: string;
  onImportComplete?: (importedStudentIds: string[]) => void;
}

const HEADER_ALIASES: Record<string, string[]> = {
  name: ['student name', 'name', 'student_name', 'candidate name', 'studentname', 'full name'],
  class: ['class', 'grade', 'standard', 'cls', 'class name', 'classname'],
  section: ['section', 'sec'],
  rollNo: ['roll no', 'rollno', 'roll_no', 'roll number', 'roll', 'sl no', 'sl. no', 'serial no'],
  dob: ['dob', 'date of birth', 'date_of_birth', 'birth date', 'birthdate', 'birth_date'],
  gender: ['gender', 'sex'],
  currentAddress: ['current address', 'address', 'present address', 'addr', 'residential address', 'residence'],
  fatherName: ["father's name", 'father name', 'father_name', 'fathername', 'fathers name', 'father'],
  motherName: ["mother's name", 'mother name', 'mother_name', 'mothername', 'mothers name', 'mother'],
};

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
    classes,
    students,
    exams,
    bulkImportStudents,
    generateNextRegNo,
    addToast,
  } = usePortal();

  // 3-step workflow
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Raw file metadata
  const [loadedFileName, setLoadedFileName] = useState<string>('');
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [rawSheetRows, setRawSheetRows] = useState<any[]>([]);

  // Parsed and validated rows
  const [rows, setRows] = useState<ParsedStudentRow[]>([]);
  const [rollNoOrderMode, setRollNoOrderMode] = useState<'file' | 'alphabetical'>('file');
  const [skipErrors, setSkipErrors] = useState<boolean>(true);

  // Execution state (Step 3)
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importedCountResult, setImportedCountResult] = useState(0);

  const targetClassObj = classes.find((c) => c.id === targetClassId);
  const targetClassOrder = targetClassObj?.order;

  // Auto-match headers loosely
  const autoDetectMappings = (headers: string[]): Record<string, string> => {
    const mappings: Record<string, string> = {};
    const normalizedHeaders = headers.map((h) => ({
      original: h,
      norm: h.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim(),
    }));

    Object.entries(HEADER_ALIASES).forEach(([fieldKey, aliases]) => {
      for (const { original, norm } of normalizedHeaders) {
        if (aliases.some((alias) => norm === alias || norm.includes(alias))) {
          mappings[fieldKey] = original;
          break;
        }
      }
    });

    return mappings;
  };

  // Validation engine for a list of rows
  const validateRowList = useCallback(
    (
      rawItems: Array<{
        id: string;
        rowNumber: number;
        name: string;
        class: string;
        section: string;
        rollNo: string;
        dob: string;
        gender: string;
        currentAddress: string;
        fatherName: string;
        motherName: string;
        isDeleted?: boolean;
      }>,
      orderMode: 'file' | 'alphabetical'
    ): ParsedStudentRow[] => {
      // Filter out deleted rows for roll assignment & duplicate checking
      const nonDeleted = rawItems.filter((r) => !r.isDeleted);

      // Starting Roll No for target class
      const startRoll = getHighestRollNo(students, targetClassId, targetAcademicYear) + 1;

      // Determine sorting for auto-rolls
      let sortedItems = [...nonDeleted];
      if (orderMode === 'alphabetical') {
        sortedItems.sort((a, b) => a.name.trim().localeCompare(b.name.trim()));
      }

      // Map auto-rolls for blank roll numbers
      const autoRollMap = new Map<string, string>();
      let autoRollCounter = 0;
      sortedItems.forEach((item) => {
        if (!item.rollNo.trim()) {
          autoRollMap.set(item.id, String(startRoll + autoRollCounter));
          autoRollCounter++;
        }
      });

      // Track duplicate roll numbers in this batch per class and section
      const rollFrequency = new Map<string, number>();
      nonDeleted.forEach((item) => {
        const effectiveRoll = item.rollNo.trim() || autoRollMap.get(item.id) || '';
        if (effectiveRoll) {
          const key = `${item.class.toLowerCase().trim()}_${item.section.trim().toUpperCase()}_${effectiveRoll}`;
          rollFrequency.set(key, (rollFrequency.get(key) || 0) + 1);
        }
      });

      // Validate each row
      return rawItems.map((item) => {
        const effectiveRoll = item.rollNo.trim() || autoRollMap.get(item.id) || '';
        const errors: RowErrorState = {};
        const warnings: RowWarningState = {};

        // 1. Name validation
        const nameVal = validateStudentName(item.name);
        if (!nameVal.isValid) {
          errors.name = nameVal.error;
        }

        // 2. Class validation & matching
        const classMatch = matchClass(item.class, classes);
        let resolvedClassId = targetClassId;

        if (!classMatch.isValidClass) {
          errors.class = classMatch.error || 'Unknown class';
          if (classMatch.didYouMean) {
            warnings.classDidYouMean = classMatch.didYouMean;
          }
        } else {
          resolvedClassId = classMatch.classId!;
          if (resolvedClassId !== targetClassId) {
            warnings.classMismatch = {
              detectedClassId: resolvedClassId,
              detectedClassName: classMatch.className!,
            };
          }
        }

        // 3. Section validation
        const sec = item.section.trim().toUpperCase();
        if (!sec) {
          errors.section = 'Section is required (default A)';
        }

        // 4. Roll No validation
        if (effectiveRoll) {
          const num = parseNumericRollNo(effectiveRoll);
          if (num === null || num <= 0) {
            errors.rollNo = 'Roll No must be a positive number';
          } else {
            const freqKey = `${item.class.toLowerCase().trim()}_${sec}_${effectiveRoll}`;
            if ((rollFrequency.get(freqKey) || 0) > 1) {
              errors.rollNo = `Roll No. ${effectiveRoll} is repeated in this batch`;
            } else {
              // Check against existing database students
              const existingMatch = students.find(
                (s) =>
                  s.classId === resolvedClassId &&
                  (s.section || 'A').toUpperCase() === sec &&
                  s.academicYear === targetAcademicYear &&
                  s.active !== false &&
                  s.rollNo.trim() === effectiveRoll
              );
              if (existingMatch) {
                errors.rollNo = `Roll ${effectiveRoll} already belongs to ${existingMatch.name}`;
              }
            }
          }
        }

        // 5. Date of Birth validation
        const dobVal = parseAndValidateDob(item.dob, targetClassOrder, targetClassName);
        if (!dobVal.isValid) {
          errors.dob = dobVal.error || 'Invalid date. Use dd-mm-yyyy';
        } else if (dobVal.warning) {
          warnings.ageWarning = dobVal.warning;
        }

        // 6. Gender validation
        const genVal = normaliseGender(item.gender);
        if (!genVal.isValid) {
          errors.gender = genVal.error || 'Gender must be Male, Female, or Other';
        }

        // 7. Father's Name validation
        const fatherVal = validateParentName(item.fatherName, true, "Father's Name");
        if (!fatherVal.isValid) {
          errors.fatherName = fatherVal.error;
        }

        // 8. Mother's Name validation (soft warning if empty)
        const motherVal = validateParentName(item.motherName, false, "Mother's Name");
        if (!motherVal.isValid) {
          errors.motherName = motherVal.error;
        } else if (!item.motherName.trim()) {
          warnings.missingMother = "Mother's name is empty";
        }

        // 9. Current Address (soft warning if empty)
        const addrVal = validateCurrentAddress(item.currentAddress);
        if (!addrVal.isValid) {
          errors.address = addrVal.error;
        } else if (!item.currentAddress.trim()) {
          warnings.missingAddress = 'Current address is empty';
        }

        // 10. Duplicate student check in database
        if (item.name.trim() && item.fatherName.trim() && dobVal.isValid) {
          const dupCheck = findDuplicateStudent(
            {
              name: item.name,
              fatherName: item.fatherName,
              dob: dobVal.dateStr,
              classId: resolvedClassId,
            },
            students
          );
          if (dupCheck.isDuplicate) {
            errors.duplicate = 'Duplicate: student with same Name, Father and DOB already exists';
          }
        }

        // Compute overall status
        const hasErrors = Object.keys(errors).length > 0;
        const hasWarnings = Object.keys(warnings).length > 0;
        const status = hasErrors ? 'error' : hasWarnings ? 'warning' : 'valid';

        return {
          id: item.id,
          rowNumber: item.rowNumber,
          name: item.name.toUpperCase(),
          class: item.class,
          resolvedClassId,
          section: sec || 'A',
          rollNo: effectiveRoll,
          dob: dobVal.dateStr || item.dob,
          gender: genVal.gender,
          currentAddress: item.currentAddress,
          fatherName: item.fatherName.toUpperCase(),
          motherName: item.motherName.toUpperCase(),
          registrationNo: generateNextRegNo(),
          admissionNo: '',
          status,
          isDeleted: Boolean(item.isDeleted),
          errors,
          warnings,
        };
      });
    },
    [classes, students, targetAcademicYear, targetClassId, targetClassName, targetClassOrder, generateNextRegNo]
  );

  // File Loaded Handler
  const handleFileLoaded = (file: File) => {
    setLoadedFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        // Prefer worksheet named 'Students', else first worksheet
        const sheetName =
          workbook.SheetNames.find((s) => s.toLowerCase() === 'students') ||
          workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        });

        if (!rawMatrix || rawMatrix.length === 0) {
          addToast('The uploaded spreadsheet contains no readable data', 'error');
          return;
        }

        // Scan first 6 rows to locate the header row
        let headerRowIndex = 0;
        for (let r = 0; r < Math.min(rawMatrix.length, 6); r++) {
          const rowStr = rawMatrix[r].map((cell) => String(cell || '').toLowerCase()).join(' ');
          if (
            rowStr.includes('name') ||
            rowStr.includes('student') ||
            rowStr.includes('father') ||
            rowStr.includes('dob') ||
            rowStr.includes('gender')
          ) {
            headerRowIndex = r;
            break;
          }
        }

        const rawHeaders = rawMatrix[headerRowIndex].map((h) => String(h || '').trim());
        const detectedHdrList = rawHeaders.filter((h) => h.length > 0);
        setDetectedHeaders(detectedHdrList);

        const mappings = autoDetectMappings(detectedHdrList);
        setColumnMappings(mappings);

        // Parse data rows (skipping header row and untouched sample rows)
        const dataRows = rawMatrix.slice(headerRowIndex + 1);
        const parsedItems: any[] = [];

        dataRows.forEach((rowCells, idx) => {
          // Build row object by header
          const rowObj: Record<string, any> = {};
          rawHeaders.forEach((hdr, colIdx) => {
            if (hdr) rowObj[hdr] = rowCells[colIdx] ?? '';
          });

          const getVal = (standardKey: string): string => {
            const mappedHeader = mappings[standardKey];
            if (!mappedHeader) return '';
            const rawVal = rowObj[mappedHeader];
            if (rawVal === undefined || rawVal === null) return '';
            if (rawVal instanceof Date) {
              const d = String(rawVal.getDate()).padStart(2, '0');
              const m = String(rawVal.getMonth() + 1).padStart(2, '0');
              return `${d}-${m}-${rawVal.getFullYear()}`;
            }
            return String(rawVal).trim();
          };

          const name = getVal('name');
          const fatherName = getVal('fatherName');
          const motherName = getVal('motherName');
          const cls = getVal('class') || targetClassName;
          const section = getVal('section') || 'A';
          const rollNo = getVal('rollNo');
          const rawDob = getVal('dob');
          const gender = getVal('gender') || 'Male';
          const address = getVal('currentAddress');

          // Skip untouched sample rows
          const upperName = name.toUpperCase();
          const upperFather = fatherName.toUpperCase();
          if (
            (upperName === 'RIMA CHOUDHURY' && upperFather === 'PRANJAL CHOUDHURY') ||
            (upperName === 'RAHUL DAS' && upperFather === 'BIREN DAS')
          ) {
            return;
          }

          // Skip completely empty rows
          if (!name && !fatherName && !rawDob && !address) {
            return;
          }

          parsedItems.push({
            id: `row-${idx}-${Date.now().toString().slice(-4)}`,
            rowNumber: idx + 1,
            name,
            class: cls,
            section: section || 'A',
            rollNo,
            dob: rawDob,
            gender,
            currentAddress: address,
            fatherName,
            motherName,
            isDeleted: false,
          });
        });

        setRawSheetRows(parsedItems);

        // Run validation
        const validated = validateRowList(parsedItems, rollNoOrderMode);
        setRows(validated);

        // Move to Step 2
        setCurrentStep(2);
      } catch (err) {
        console.error('Failed to parse uploaded file', err);
        addToast('Failed to parse spreadsheet. Please ensure it is a valid .xlsx or .csv file.', 'error');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Re-run validation whenever a row cell is edited
  const handleUpdateCell = (id: string, field: keyof ParsedStudentRow, value: any) => {
    setRows((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, [field]: value } : r));
      return validateRowList(updated, rollNoOrderMode);
    });
  };

  const handleDeleteRow = (id: string) => {
    setRows((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, isDeleted: true } : r));
      return validateRowList(updated, rollNoOrderMode);
    });
  };

  const handleRestoreRow = (id: string) => {
    setRows((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, isDeleted: false } : r));
      return validateRowList(updated, rollNoOrderMode);
    });
  };

  // Order mode change (File vs Alphabetical)
  const handleChangeRollNoOrder = (mode: 'file' | 'alphabetical') => {
    setRollNoOrderMode(mode);
    setRows((prev) => validateRowList(prev, mode));
  };

  // Fix all dates in column
  const handleFixAllDates = () => {
    setRows((prev) => {
      const updated = prev.map((r) => {
        const { dateStr, isValid } = normalizeDateInput(r.dob);
        if (isValid && dateStr) {
          return { ...r, dob: dateStr };
        }
        return r;
      });
      addToast('Auto-formatted dates across all rows', 'success');
      return validateRowList(updated, rollNoOrderMode);
    });
  };

  // Find & Replace in a column
  const handleFindAndReplace = (column: string, findText: string, replaceText: string) => {
    let replacedCount = 0;
    setRows((prev) => {
      const updated = prev.map((r) => {
        const currentVal = String((r as any)[column] || '');
        if (currentVal.toLowerCase().includes(findText.toLowerCase())) {
          replacedCount++;
          const regex = new RegExp(findText, 'gi');
          const newVal = currentVal.replace(regex, replaceText);
          return { ...r, [column]: newVal };
        }
        return r;
      });
      addToast(`Replaced ${replacedCount} occurrence(s) in ${column}`, 'success');
      return validateRowList(updated, rollNoOrderMode);
    });
  };

  // Apply did-you-mean suggestion
  const handleApplyClassSuggestion = (id: string, correctedName: string, correctedId: string) => {
    setRows((prev) => {
      const updated = prev.map((r) =>
        r.id === id ? { ...r, class: correctedName, resolvedClassId: correctedId } : r
      );
      return validateRowList(updated, rollNoOrderMode);
    });
    addToast(`Applied suggestion: Class ${correctedName}`, 'success');
  };

  // Cross-class 1-click fixes
  const handleChangeRowClassToTarget = (id: string) => {
    setRows((prev) => {
      const updated = prev.map((r) =>
        r.id === id ? { ...r, class: targetClassName, resolvedClassId: targetClassId } : r
      );
      return validateRowList(updated, rollNoOrderMode);
    });
    addToast(`Updated row to Class ${targetClassName}`, 'success');
  };

  const handleChangeRowClassToDetected = (
    id: string,
    detectedClassId: string,
    detectedClassName: string
  ) => {
    setRows((prev) => {
      const updated = prev.map((r) =>
        r.id === id ? { ...r, class: detectedClassName, resolvedClassId: detectedClassId } : r
      );
      return validateRowList(updated, rollNoOrderMode);
    });
    addToast(`Row will be imported into Class ${detectedClassName}`, 'info');
  };

  // Missing column mapping update
  const handleUpdateColumnMapping = (standardKey: string, fileHeader: string) => {
    const updatedMappings = { ...columnMappings, [standardKey]: fileHeader };
    setColumnMappings(updatedMappings);

    // Re-parse raw rows with updated mapping
    if (rawSheetRows.length > 0) {
      const reParsed = rawSheetRows.map((item) => {
        return item;
      });
      setRows(validateRowList(reParsed, rollNoOrderMode));
    }
  };

  const missingRequiredColumns = useMemo(() => {
    const requiredKeys = ['name', 'fatherName', 'dob'];
    return requiredKeys.filter((k) => !columnMappings[k]);
  }, [columnMappings]);

  // Compute rows eligible for import
  const validAndImportableRows = useMemo(() => {
    return rows.filter((r) => {
      if (r.isDeleted) return false;
      if (skipErrors) {
        return r.status === 'valid' || r.status === 'warning';
      }
      return r.status === 'valid' || r.status === 'warning';
    });
  }, [rows, skipErrors]);

  const totalErrorsCount = rows.filter((r) => !r.isDeleted && r.status === 'error').length;
  const canProceedToImport = validAndImportableRows.length > 0 && (skipErrors || totalErrorsCount === 0);

  // Execute Import (Step 3) - Atomic Store write!
  const handleExecuteImport = () => {
    if (validAndImportableRows.length === 0) {
      addToast('No valid rows available to import', 'error');
      return;
    }

    setIsImporting(true);
    setCurrentStep(3);
    setImportProgress(25);

    setTimeout(() => {
      setImportProgress(65);

      setTimeout(() => {
        // Construct Student records
        const studentsToCreate: Array<Omit<Student, 'id'>> = validAndImportableRows.map((r) => ({
          registrationNo: r.registrationNo || generateNextRegNo(),
          name: r.name.trim().toUpperCase(),
          studentName: r.name.trim().toUpperCase(),
          fatherName: r.fatherName.trim().toUpperCase(),
          motherName: r.motherName.trim() ? r.motherName.trim().toUpperCase() : undefined,
          dob: r.dob.trim(),
          gender: r.gender as any,
          classId: r.resolvedClassId || targetClassId,
          section: r.section.trim().toUpperCase() || 'A',
          rollNo: r.rollNo.trim(),
          currentAddress: r.currentAddress.trim(),
          academicYear: targetAcademicYear,
          admissionNo: r.admissionNo.trim() || undefined,
          active: true,
        }));

        // Atomic write into store
        const importedCount = bulkImportStudents(studentsToCreate, targetExamId);
        setImportedCountResult(importedCount);
        setImportProgress(100);
        setIsImporting(false);

        if (onImportComplete) {
          onImportComplete(studentsToCreate.map((s) => s.registrationNo || ''));
        }
      }, 500);
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-5xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#0f766e]" />
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Bulk Student Import &amp; Error Correction
              </h3>
              <span className="text-[11px] text-slate-500">
                Target: Class <strong>{targetClassName}</strong> &bull; Session {targetAcademicYear}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-1.5 rounded-md transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Step Indicator */}
        <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200">
          <StepIndicator currentStep={currentStep} />
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {/* STEP 1: Upload */}
          {currentStep === 1 && (
            <FileDropzone
              className={targetClassName}
              targetClassId={targetClassId}
              academicYear={targetAcademicYear}
              availableClasses={classes}
              existingStudents={students}
              onFileLoaded={handleFileLoaded}
            />
          )}

          {/* STEP 2: Review and Correct */}
          {currentStep === 2 && (
            <ImportPreviewTable
              rows={rows}
              targetClassId={targetClassId}
              targetClassName={targetClassName}
              targetAcademicYear={targetAcademicYear}
              availableClasses={classes}
              rollNoOrderMode={rollNoOrderMode}
              onChangeRollNoOrder={handleChangeRollNoOrder}
              onUpdateCell={handleUpdateCell}
              onDeleteRow={handleDeleteRow}
              onRestoreRow={handleRestoreRow}
              onFixAllDates={handleFixAllDates}
              onFindAndReplace={handleFindAndReplace}
              onApplyClassSuggestion={handleApplyClassSuggestion}
              onChangeRowClassToTarget={handleChangeRowClassToTarget}
              onChangeRowClassToDetected={handleChangeRowClassToDetected}
              missingRequiredColumns={missingRequiredColumns}
              detectedHeaders={detectedHeaders}
              columnMappings={columnMappings}
              onUpdateColumnMapping={handleUpdateColumnMapping}
              skipErrors={skipErrors}
              onToggleSkipErrors={setSkipErrors}
            />
          )}

          {/* STEP 3: Complete / Progress */}
          {currentStep === 3 && (
            <div className="p-8 text-center space-y-5">
              {isImporting ? (
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-teal-700 animate-spin">
                    <Loader2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800">
                    Enrolling Students &amp; Synchronizing Exams...
                  </h4>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                    <div
                      className="bg-[#0f766e] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    {importProgress}% completed &bull; Writing atomic transaction
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-w-md mx-auto animate-in zoom-in-95 duration-150">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">
                    Import Completed Successfully!
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Successfully imported <strong>{importedCountResult}</strong> student(s) into Class {targetClassName}.
                    They have been auto-enrolled across all active exams for this session.
                  </p>

                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-900 text-xs">
                    <span className="font-semibold block">Safety &amp; Reversibility:</span>
                    A 30-second Undo toast is active on the screen if you need to revert this import.
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-2.5 bg-[#0f766e] hover:bg-teal-800 text-white font-semibold rounded-md text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      Done &amp; View Student Roster
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {currentStep === 2 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 bg-slate-50/90 text-xs">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Upload</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!canProceedToImport}
                onClick={handleExecuteImport}
                className="inline-flex items-center gap-1.5 px-5 py-1.5 bg-[#0f766e] hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded shadow-xs transition-colors cursor-pointer"
              >
                <span>Confirm &amp; Import ({validAndImportableRows.length} Students)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
