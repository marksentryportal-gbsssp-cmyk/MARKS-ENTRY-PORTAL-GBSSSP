import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  Send,
  AlertTriangle,
  Lock,
  Clock,
  Sparkles,
  FileCheck2,
  FileEdit,
  RotateCcw,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { Subject, MarkRecord, Student } from '../../types';
import { GuidelinesCard } from './GuidelinesCard';
import { StudentInfoBar } from './StudentInfoBar';
import { SubjectMarksTable, SubjectMarksValues } from './SubjectMarksTable';
import { NextExamSelector } from './NextExamSelector';
import { EditStudentModal } from './EditStudentModal';
import { ConfirmSubmitModal } from './ConfirmSubmitModal';
import { getExamStatus } from '../../utils/dateUtils';

interface CandidateMarksEntryPageProps {
  classId: string;
  examId: string;
  studentId: string;
}

export const CandidateMarksEntryPage: React.FC<CandidateMarksEntryPageProps> = ({
  classId,
  examId,
  studentId,
}) => {
  const {
    classes,
    exams,
    examTypes,
    students,
    subjects,
    marks,
    getStudentsForExam,
    getMarksStatus,
    getStudentExamStatus,
    saveCandidateMarks,
    markStudentAbsentAll,
    undoStudentAbsentAll,
    navigateTo,
    addToast,
  } = usePortal();

  // Find active records
  const currentClass = classes.find((c) => c.id === classId) || {
    id: classId,
    name: classId,
    order: 0,
    hasStreams: false,
  };

  const currentExam = exams.find((e) => e.id === examId);
  const examStudentList = useMemo(() => getStudentsForExam(examId), [examId, students]);
  const currentStudent = students.find((s) => s.id === studentId);

  // Position in student roster
  const currentIndex = examStudentList.findIndex((s) => s.id === studentId);

  // Class subjects sorted by order
  const classSubjects = useMemo(() => {
    return subjects
      .filter((s) => s.classId === classId && !s.hidden)
      .sort((a, b) => a.order - b.order);
  }, [subjects, classId]);

  // Read-only conditions
  const examStatus = currentExam ? getExamStatus(currentExam.startDate, currentExam.endDate, currentExam.isFinalSubmitted) : 'Open';
  const isFinalSubmitted = Boolean(currentExam?.isFinalSubmitted);
  const isOutsideDates = examStatus === 'Closed' || examStatus === 'NotStarted';
  const isReadOnly = isFinalSubmitted || isOutsideDates;

  // Next exam in sequence for this class
  const nextExam = useMemo(() => {
    if (!currentExam) return null;
    const sameClassExams = exams
      .filter(
        (e) =>
          e.classId === currentClass.id &&
          e.academicYear === currentExam.academicYear
      )
      .sort((a, b) => {
        const orderA = examTypes.find((t) => t.id === a.examTypeId)?.order || 0;
        const orderB = examTypes.find((t) => t.id === b.examTypeId)?.order || 0;
        return orderA - orderB;
      });

    const currIdx = sameClassExams.findIndex((e) => e.id === examId);
    if (currIdx !== -1 && currIdx + 1 < sameClassExams.length) {
      return sameClassExams[currIdx + 1];
    }
    return null;
  }, [exams, currentClass.id, currentExam, examId, examTypes]);

  // Modals state
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false);
  const [showAllAbsentConfirm, setShowAllAbsentConfirm] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingSubmitAction, setPendingSubmitAction] = useState<'submit_only' | 'submit_and_next'>('submit_and_next');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form State: marks per subject
  const [marksState, setMarksState] = useState<Record<string, SubjectMarksValues>>({});
  const [includeInNextExam, setIncludeInNextExam] = useState<boolean>(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isAllAbsentFlag, setIsAllAbsentFlag] = useState<boolean>(false);
  const [pendingWarning, setPendingWarning] = useState<string | null>(null);

  // Check if student marks are already completed (Edit Mode)
  const isAlreadyCompleted = getMarksStatus(examId, studentId) === 'completed';

  // Initialize marksState from central store marks
  useEffect(() => {
    if (!currentStudent || !currentExam) return;

    // Check existing student exam status
    const existingStatus = getStudentExamStatus(examId, studentId);
    if (existingStatus) {
      setIncludeInNextExam(existingStatus.includeInNextExam ?? true);
      setIsAllAbsentFlag(existingStatus.status === 'absent_all');
    } else {
      setIncludeInNextExam(true);
      setIsAllAbsentFlag(false);
    }

    // Populate marks from existing records
    const initialValues: Record<string, SubjectMarksValues> = {};

    classSubjects.forEach((sub) => {
      // Find marks for this subject
      const subMarks = marks.filter(
        (m) =>
          m.examId === examId &&
          m.studentId === studentId &&
          m.subjectId === sub.id
      );

      const descRecord = subMarks.find((m) => m.component === 'descriptive') || subMarks[0];
      const pracRecord = subMarks.find((m) => m.component === 'practical');
      const iaRecord = subMarks.find((m) => m.component === 'ia');

      initialValues[sub.id] = {
        descriptive: descRecord
          ? descRecord.absent
            ? 'A'
            : descRecord.obtained !== null
            ? String(descRecord.obtained)
            : ''
          : '',
        practical: pracRecord
          ? pracRecord.absent
            ? 'A'
            : pracRecord.obtained !== null
            ? String(pracRecord.obtained)
            : ''
          : '',
        ia: iaRecord
          ? iaRecord.absent
            ? 'A'
            : iaRecord.obtained !== null
            ? String(iaRecord.obtained)
            : ''
          : '',
        grade: descRecord?.grade || '',
      };
    });

    setMarksState(initialValues);
    setValidationErrors({});
    setPendingWarning(null);
  }, [examId, studentId, classSubjects, marks]);

  // Handle single component value change
  const handleMarksChange = (
    subjectId: string,
    component: 'descriptive' | 'practical' | 'ia',
    value: string
  ) => {
    const trimmed = value.trim();
    const errorKey = `${subjectId}_${component}`;

    // Subject & Component max marks
    const sub = classSubjects.find((s) => s.id === subjectId);
    let max = 100;
    if (sub) {
      if (sub.componentsByExamType && currentExam && sub.componentsByExamType[currentExam.examTypeId]) {
        max = sub.componentsByExamType[currentExam.examTypeId][component] || 100;
      } else if (sub.components) {
        max = sub.components[component] || 100;
      } else {
        max = sub.fullMarks || 100;
      }
    }

    // Validation
    const nextErrors = { ...validationErrors };
    if (trimmed === '') {
      delete nextErrors[errorKey];
    } else if (trimmed.toUpperCase() === 'A') {
      delete nextErrors[errorKey];
    } else {
      const num = parseFloat(trimmed);
      if (isNaN(num)) {
        nextErrors[errorKey] = `Enter a number from 0 to ${max}, or A for absent.`;
      } else if (num < 0) {
        nextErrors[errorKey] = 'Marks cannot be negative.';
      } else if (num > max) {
        nextErrors[errorKey] = `Marks cannot exceed ${max}.`;
      } else {
        delete nextErrors[errorKey];
      }
    }

    setValidationErrors(nextErrors);
    setMarksState((prev) => ({
      ...prev,
      [subjectId]: {
        ...(prev[subjectId] || { descriptive: '', practical: '', ia: '' }),
        [component]: trimmed.toUpperCase() === 'A' ? 'A' : trimmed,
      },
    }));

    // If candidate was in absent_all mode, editing any field clears that blanket flag
    if (isAllAbsentFlag) {
      setIsAllAbsentFlag(false);
    }
  };

  const handleGradeChange = (subjectId: string, grade: string) => {
    setMarksState((prev) => ({
      ...prev,
      [subjectId]: {
        ...(prev[subjectId] || { descriptive: '', practical: '', ia: '' }),
        grade,
      },
    }));
  };

  // Toggle blanket Mark Absent
  const handleToggleBlanketAbsent = () => {
    if (isAllAbsentFlag) {
      // Undo absent
      undoStudentAbsentAll(examId, studentId);
      setIsAllAbsentFlag(false);
    } else {
      // Set absent
      markStudentAbsentAll(examId, studentId, classSubjects);
      setIsAllAbsentFlag(true);

      // Fill all fields with 'A'
      const updated: Record<string, SubjectMarksValues> = {};
      classSubjects.forEach((sub) => {
        updated[sub.id] = {
          descriptive: 'A',
          practical: 'A',
          ia: 'A',
          grade: 'ABSENT',
        };
      });
      setMarksState(updated);
      setValidationErrors({});
    }
  };

  // Validate entire form for submission
  const validateForSubmit = (): { isValid: boolean; pendingCount: number } => {
    const errors: Record<string, string> = {};
    let pendingCount = 0;

    classSubjects.forEach((sub) => {
      const val = marksState[sub.id] || { descriptive: '', practical: '', ia: '' };

      if (sub.type === 'grade') {
        if (!val.grade || val.grade.trim() === '') {
          errors[`${sub.id}_grade`] = 'Please select a grade or Absent';
          pendingCount++;
        }
        return;
      }

      // Check each active component
      let descriptiveMax = 0;
      let practicalMax = 0;
      let iaMax = 0;

      if (sub.componentsByExamType && currentExam && sub.componentsByExamType[currentExam.examTypeId]) {
        const c = sub.componentsByExamType[currentExam.examTypeId];
        descriptiveMax = c.descriptive || 0;
        practicalMax = c.practical || 0;
        iaMax = c.ia || 0;
      } else if (sub.components) {
        descriptiveMax = sub.components.descriptive || 0;
        practicalMax = sub.components.practical || 0;
        iaMax = sub.components.ia || 0;
      } else {
        descriptiveMax = sub.fullMarks || 100;
      }

      // Descriptive check
      if (descriptiveMax > 0) {
        const v = val.descriptive.trim();
        if (v === '') {
          errors[`${sub.id}_descriptive`] = `Required (0 - ${descriptiveMax} or A)`;
          pendingCount++;
        } else if (v.toUpperCase() !== 'A') {
          const n = parseFloat(v);
          if (isNaN(n) || n < 0 || n > descriptiveMax) {
            errors[`${sub.id}_descriptive`] = `Must be between 0 and ${descriptiveMax}`;
            pendingCount++;
          }
        }
      }

      // Practical check
      if (practicalMax > 0) {
        const v = val.practical.trim();
        if (v === '') {
          errors[`${sub.id}_practical`] = `Required (0 - ${practicalMax} or A)`;
          pendingCount++;
        } else if (v.toUpperCase() !== 'A') {
          const n = parseFloat(v);
          if (isNaN(n) || n < 0 || n > practicalMax) {
            errors[`${sub.id}_practical`] = `Must be between 0 and ${practicalMax}`;
            pendingCount++;
          }
        }
      }

      // IA check
      if (iaMax > 0) {
        const v = val.ia.trim();
        if (v === '') {
          errors[`${sub.id}_ia`] = `Required (0 - ${iaMax} or A)`;
          pendingCount++;
        } else if (v.toUpperCase() !== 'A') {
          const n = parseFloat(v);
          if (isNaN(n) || n < 0 || n > iaMax) {
            errors[`${sub.id}_ia`] = `Must be between 0 and ${iaMax}`;
            pendingCount++;
          }
        }
      }
    });

    setValidationErrors(errors);
    return { isValid: pendingCount === 0, pendingCount };
  };

  // Compile MarkRecord[] from marksState
  const compileMarkRecords = (): MarkRecord[] => {
    const records: MarkRecord[] = [];

    classSubjects.forEach((sub) => {
      const val = marksState[sub.id] || { descriptive: '', practical: '', ia: '' };

      if (sub.type === 'grade') {
        const isAbsent = val.grade === 'ABSENT';
        records.push({
          examId,
          studentId,
          subjectId: sub.id,
          component: 'descriptive',
          obtained: null,
          absent: isAbsent,
          grade: val.grade,
        });
        return;
      }

      let descriptiveMax = 0;
      let practicalMax = 0;
      let iaMax = 0;

      if (sub.componentsByExamType && currentExam && sub.componentsByExamType[currentExam.examTypeId]) {
        const c = sub.componentsByExamType[currentExam.examTypeId];
        descriptiveMax = c.descriptive || 0;
        practicalMax = c.practical || 0;
        iaMax = c.ia || 0;
      } else if (sub.components) {
        descriptiveMax = sub.components.descriptive || 0;
        practicalMax = sub.components.practical || 0;
        iaMax = sub.components.ia || 0;
      } else {
        descriptiveMax = sub.fullMarks || 100;
      }

      // Descriptive component
      if (descriptiveMax > 0) {
        const raw = val.descriptive.trim().toUpperCase();
        const absent = raw === 'A';
        const obtained = absent || raw === '' ? null : parseFloat(raw);
        records.push({
          examId,
          studentId,
          subjectId: sub.id,
          component: 'descriptive',
          obtained,
          absent,
        });
      }

      // Practical component
      if (practicalMax > 0) {
        const raw = val.practical.trim().toUpperCase();
        const absent = raw === 'A';
        const obtained = absent || raw === '' ? null : parseFloat(raw);
        records.push({
          examId,
          studentId,
          subjectId: sub.id,
          component: 'practical',
          obtained,
          absent,
        });
      }

      // IA component
      if (iaMax > 0) {
        const raw = val.ia.trim().toUpperCase();
        const absent = raw === 'A';
        const obtained = absent || raw === '' ? null : parseFloat(raw);
        records.push({
          examId,
          studentId,
          subjectId: sub.id,
          component: 'ia',
          obtained,
          absent,
        });
      }
    });

    return records;
  };

  // Check if every entered subject is absent ('A')
  const checkIfAllEnteredAbsent = (records: MarkRecord[]): boolean => {
    if (records.length === 0) return false;
    return records.every((r) => r.absent);
  };

  // Calculate summary metrics for confirmation modal and overview
  const summaryInfo = useMemo(() => {
    let totalObtained = 0;
    let totalFullMarks = 0;
    const absentSubs: string[] = [];

    classSubjects.forEach((sub) => {
      const val = marksState[sub.id] || { descriptive: '', practical: '', ia: '' };

      if (sub.type === 'grade') {
        if (val.grade === 'ABSENT') {
          absentSubs.push(sub.name);
        }
        return;
      }

      let subObt = 0;
      let hasObt = false;
      let isSubAbsent = false;

      let dMax = 0;
      let pMax = 0;
      let iMax = 0;

      if (sub.componentsByExamType && currentExam && sub.componentsByExamType[currentExam.examTypeId]) {
        const c = sub.componentsByExamType[currentExam.examTypeId];
        dMax = c.descriptive || 0;
        pMax = c.practical || 0;
        iMax = c.ia || 0;
      } else if (sub.components) {
        dMax = sub.components.descriptive || 0;
        pMax = sub.components.practical || 0;
        iMax = sub.components.ia || 0;
      } else {
        dMax = sub.fullMarks || 100;
      }

      if (sub.includeInTotal !== false) {
        totalFullMarks += dMax + pMax + iMax;
      }

      if (dMax > 0) {
        const d = val.descriptive.trim().toUpperCase();
        if (d === 'A') isSubAbsent = true;
        else if (d !== '' && !isNaN(parseFloat(d))) {
          subObt += parseFloat(d);
          hasObt = true;
        }
      }

      if (pMax > 0) {
        const p = val.practical.trim().toUpperCase();
        if (p === 'A') isSubAbsent = true;
        else if (p !== '' && !isNaN(parseFloat(p))) {
          subObt += parseFloat(p);
          hasObt = true;
        }
      }

      if (iMax > 0) {
        const i = val.ia.trim().toUpperCase();
        if (i === 'A') isSubAbsent = true;
        else if (i !== '' && !isNaN(parseFloat(i))) {
          subObt += parseFloat(i);
          hasObt = true;
        }
      }

      if (hasObt && sub.includeInTotal !== false) {
        totalObtained += subObt;
      }

      if (isSubAbsent) {
        absentSubs.push(sub.name);
      }
    });

    return {
      totalObtained: Math.round(totalObtained * 10) / 10,
      totalFullMarks,
      absentCount: absentSubs.length,
      absentSubjects: absentSubs,
    };
  }, [classSubjects, marksState, currentExam]);

  // Trigger Submit Confirmation Pop-up
  const handleTriggerSubmit = (mode: 'submit_only' | 'submit_and_next') => {
    if (isReadOnly) {
      addToast('Examination is closed or final submitted. Read-only mode.', 'error');
      return;
    }

    const { isValid, pendingCount } = validateForSubmit();
    if (!isValid) {
      setPendingWarning(
        `${pendingCount} subject component(s) pending marks entry. Please fill all fields or click "Save as draft".`
      );
      addToast(`${pendingCount} subject component(s) pending marks entry!`, 'error');

      // Scroll to the first problematic input
      setTimeout(() => {
        const firstProblem = document.querySelector<HTMLElement>(
          '[data-has-error="true"], [aria-invalid="true"], select[data-has-error="true"]'
        );
        if (firstProblem) {
          firstProblem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstProblem.focus();
        }
      }, 50);
      return;
    }

    setPendingWarning(null);
    setPendingSubmitAction(mode);
    setSubmitError(null);
    setIsConfirmModalOpen(true);
  };

  // Perform actual submit when confirmed in modal
  const handleConfirmSubmit = async () => {
    if (isReadOnly || !currentStudent) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const records = compileMarkRecords();

      // Save to store
      saveCandidateMarks({
        examId,
        studentId,
        marks: records,
        isDraft: false,
        includeInNextExam,
        updatedBy: 'Teacher / Exam Incharge',
      });

      // Brief animation for spinner feedback
      await new Promise((resolve) => setTimeout(resolve, 250));

      setIsSubmitting(false);
      setIsConfirmModalOpen(false);

      if (isAlreadyCompleted) {
        addToast(`Marks updated successfully for ${currentStudent.name}`, 'success');
      } else {
        addToast(`Marks submitted successfully for ${currentStudent.name}`, 'success');
      }

      if (pendingSubmitAction === 'submit_and_next') {
        // Find next student with status !== 'completed'
        let nextIncompleteStudent: Student | null = null;

        // Check students after currentIndex
        for (let i = currentIndex + 1; i < examStudentList.length; i++) {
          const s = examStudentList[i];
          if (getMarksStatus(examId, s.id) !== 'completed') {
            nextIncompleteStudent = s;
            break;
          }
        }

        // Wrap around from beginning to currentIndex - 1
        if (!nextIncompleteStudent) {
          for (let i = 0; i < currentIndex; i++) {
            const s = examStudentList[i];
            if (getMarksStatus(examId, s.id) !== 'completed') {
              nextIncompleteStudent = s;
              break;
            }
          }
        }

        if (nextIncompleteStudent) {
          navigateTo(`/marks-entry/${classId}/${examId}/${nextIncompleteStudent.id}`);
        } else {
          addToast('All students completed', 'success');
          navigateTo(`/marks-entry/${classId}/${examId}`);
        }
      } else {
        // 'submit_only'
        navigateTo(`/marks-entry/${classId}/${examId}`);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError('Failed to save marks. Please check data and try again.');
    }
  };

  // Save as draft without marking as completed
  const handleSaveDraft = () => {
    if (isReadOnly) {
      addToast('Examination is closed or final submitted. Read-only mode.', 'error');
      return;
    }

    const records = compileMarkRecords();
    saveCandidateMarks({
      examId,
      studentId,
      marks: records,
      isDraft: true,
      includeInNextExam,
      updatedBy: 'Teacher / Exam Incharge',
    });

    addToast(`Marks for ${currentStudent?.name} saved as Draft.`, 'info');
  };

  // Navigation between students in same exam
  const handleGoToPreviousStudent = () => {
    if (currentIndex > 0) {
      const prevStudent = examStudentList[currentIndex - 1];
      navigateTo(`/marks-entry/${classId}/${examId}/${prevStudent.id}`);
    }
  };

  const handleGoToNextStudent = () => {
    if (currentIndex < examStudentList.length - 1) {
      const nextStudent = examStudentList[currentIndex + 1];
      navigateTo(`/marks-entry/${classId}/${examId}/${nextStudent.id}`);
    } else {
      addToast('Reached end of student roster for this examination.', 'info');
      navigateTo(`/marks-entry/${classId}/${examId}`);
    }
  };

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to SUBMIT & NEXT STUDENT
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isConfirmModalOpen) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleTriggerSubmit('submit_and_next');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [marksState, includeInNextExam, isAllAbsentFlag, isReadOnly, isConfirmModalOpen, currentIndex, examStudentList]);

  if (!currentExam || !currentStudent) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">
          Student or Examination Record Not Found
        </h3>
        <p className="text-xs text-slate-500">
          The requested candidate marks entry sheet does not exist or has been removed.
        </p>
        <button
          type="button"
          onClick={() => navigateTo(`/marks-entry/${classId}/${examId}`)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Examination List</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. GUIDELINES FOR MARKS ENTRY */}
      <GuidelinesCard />

      {/* Read-Only Banner if Final Submitted or Outside Dates */}
      {isReadOnly && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 flex items-center gap-3 text-amber-900 shadow-2xs">
          {isFinalSubmitted ? (
            <Lock className="w-5 h-5 text-amber-700 shrink-0" />
          ) : (
            <Clock className="w-5 h-5 text-amber-700 shrink-0" />
          )}
          <div className="text-xs">
            <span className="font-extrabold block uppercase tracking-wider">
              {isFinalSubmitted
                ? 'EXAMINATION FINAL SUBMITTED - READ ONLY MODE'
                : 'EXAMINATION WINDOW CLOSED - READ ONLY MODE'}
            </span>
            <span>
              Marks entry is currently locked for editing. Only viewing and navigation are permitted.
            </span>
          </div>
        </div>
      )}

      {/* 2. STUDENT INFO BAR & ACTIONS */}
      <StudentInfoBar
        exam={currentExam}
        student={currentStudent}
        currentIndex={currentIndex !== -1 ? currentIndex : 0}
        totalCount={examStudentList.length}
        isAllAbsent={isAllAbsentFlag}
        onPrevious={handleGoToPreviousStudent}
        onNext={handleGoToNextStudent}
        onToggleAbsent={handleToggleBlanketAbsent}
        onOpenEditStudent={() => setIsEditStudentOpen(true)}
        onStudentDeleted={() => navigateTo(`/marks-entry/${classId}/${examId}`)}
        isReadOnly={isReadOnly}
      />

      {/* Pending Validation Warning Banner */}
      {pendingWarning && (
        <div className="bg-red-50 border border-red-300 text-red-900 rounded-lg p-3.5 flex items-start gap-2.5 text-xs animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">
            <span>{pendingWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => setPendingWarning(null)}
            className="text-red-500 hover:text-red-800 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. MARKS TABLE WITH LIVE TOTALS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
            Subject Scholastic & Co-Scholastic Assessment Part
          </h3>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[10px]">Tab</kbd> or{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[10px]">Enter</kbd> to move to next cell
          </span>
        </div>

        <SubjectMarksTable
          subjects={classSubjects}
          exam={currentExam}
          marksState={marksState}
          onMarksChange={handleMarksChange}
          onGradeChange={handleGradeChange}
          validationErrors={validationErrors}
          disabled={isReadOnly || isAllAbsentFlag}
        />
      </div>

      {/* 4. GREY NOTE BOX: ADD STUDENT TO NEXT EXAM */}
      <NextExamSelector
        includeInNextExam={includeInNextExam}
        onChange={setIncludeInNextExam}
        nextExamName={nextExam ? nextExam.name : null}
        disabled={isReadOnly}
      />

      {/* 5. BOTTOM BUTTONS CENTERED */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        {/* Outlined GO BACK button */}
        <button
          type="button"
          onClick={() => navigateTo(`/marks-entry/${classId}/${examId}`)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>GO BACK</span>
        </button>

        {/* Save as draft */}
        {!isReadOnly && (
          <button
            type="button"
            onClick={handleSaveDraft}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-[#7e22ce] text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Save without marking as completed"
          >
            <FileEdit className="w-4 h-4 text-[#9333ea]" />
            <span>Save as draft</span>
          </button>
        )}

        {/* Plain SUBMIT MARKS that returns to list */}
        {!isReadOnly && (
          <button
            type="button"
            onClick={() => handleTriggerSubmit('submit_only')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isAlreadyCompleted ? 'UPDATE MARKS' : 'SUBMIT MARKS'}</span>
          </button>
        )}

        {/* Primary Default Action: SUBMIT & NEXT STUDENT (Ctrl+Enter) */}
        {!isReadOnly && (
          <button
            type="button"
            onClick={() => handleTriggerSubmit('submit_and_next')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#9333ea] hover:bg-[#7e22ce] text-white text-xs font-black tracking-wide transition-all shadow-md hover:shadow-lg cursor-pointer ring-2 ring-purple-300/50"
            title="Submit and immediately open next student (Ctrl+Enter)"
          >
            <Send className="w-4 h-4" />
            <span>{isAlreadyCompleted ? 'UPDATE & NEXT STUDENT' : 'SUBMIT & NEXT STUDENT'}</span>
            <span className="hidden md:inline text-[10px] bg-purple-900/60 text-purple-200 px-1.5 py-0.5 rounded font-mono font-normal">
              Ctrl+Enter
            </span>
          </button>
        )}
      </div>

      {/* Edit Student Modal */}
      <EditStudentModal
        student={currentStudent}
        isOpen={isEditStudentOpen}
        onClose={() => setIsEditStudentOpen(false)}
      />

      {/* Confirmation Modal for Submitting / Updating Marks */}
      {!isReadOnly && currentStudent && currentExam && (
        <ConfirmSubmitModal
          isOpen={isConfirmModalOpen}
          onClose={() => {
            if (!isSubmitting) setIsConfirmModalOpen(false);
          }}
          onConfirm={handleConfirmSubmit}
          titleText={
            isAlreadyCompleted
              ? 'Are you sure you want to Update the marks of'
              : 'Are you sure you want to Submit the marks of'
          }
          regNo={currentStudent.registrationNo}
          studentName={currentStudent.name.toUpperCase()}
          fatherName={currentStudent.fatherName ? currentStudent.fatherName.toUpperCase() : 'N/A'}
          examName={currentExam.name}
          summaryInfo={summaryInfo}
          confirmLabel={isAlreadyCompleted ? 'UPDATE' : 'SUBMIT'}
          closeLabel="CLOSE"
          isSubmitting={isSubmitting}
          error={submitError}
          onRetry={handleConfirmSubmit}
        />
      )}

      {/* ALL ABSENT WARNING DIALOG (when user typed 'A' in every subject) */}
      {showAllAbsentConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-amber-300 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Marked Absent in All Subjects</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                You have entered <strong>"A" (Absent)</strong> in all subjects for{' '}
                <strong className="text-slate-900">{currentStudent.name}</strong>.
                Would you like to set the official candidate status to <strong>"Absent in All Subjects"</strong>?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowAllAbsentConfirm(false);
                  saveCandidateMarks({
                    examId,
                    studentId,
                    marks: compileMarkRecords(),
                    isDraft: false,
                    includeInNextExam,
                    updatedBy: 'Teacher / Exam Incharge',
                  });
                  handleGoToNextStudent();
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded"
              >
                No, Keep Normal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAllAbsentConfirm(false);
                  setIsAllAbsentFlag(true);
                  saveCandidateMarks({
                    examId,
                    studentId,
                    marks: compileMarkRecords(),
                    isDraft: false,
                    includeInNextExam,
                    updatedBy: 'Teacher / Exam Incharge',
                  });
                  handleGoToNextStudent();
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#9333ea] hover:bg-[#7e22ce] rounded"
              >
                Yes, Set Full Absent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
