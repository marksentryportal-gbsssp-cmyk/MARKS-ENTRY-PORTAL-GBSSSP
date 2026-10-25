import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  Send,
  AlertTriangle,
  Lock,
  Clock,
  CheckCircle,
  CheckCircle2,
  FileEdit,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { Subject, MarkRecord, Student } from '../../types';
import { StudentInfoBar } from './StudentInfoBar';
import { SubjectMarksTable, SubjectMarksValues } from './SubjectMarksTable';
import { NextExamSelector } from './NextExamSelector';
import { EditStudentModal } from './EditStudentModal';
import { ConfirmSubmitModal } from './ConfirmSubmitModal';
import { getExamStatus } from '../../utils/dateUtils';
import { getNextStudent } from '../../utils/rollNoUtils';

interface CandidateMarksEntryPageProps {
  classId: string;
  examId: string;
  studentId: string;
}

export const CandidateMarksEntryPage: React.FC<CandidateMarksEntryPageProps> = ({
  classId,
  examId,
  studentId: initialStudentId,
}) => {
  const {
    classes,
    exams,
    examTypes,
    students,
    subjects,
    marks,
    marksStatus,
    getOrderedExamStudents,
    getMarksStatus,
    getStudentExamStatus,
    saveCandidateMarks,
    markStudentAbsentAll,
    undoStudentAbsentAll,
    navigateTo,
    addToast,
  } = usePortal();

  // In-place active student state (Never reload or unmount the whole page when switching students)
  const [activeStudentId, setActiveStudentId] = useState<string>(initialStudentId);

  // Sync if prop changes externally (e.g. browser back/forward button)
  useEffect(() => {
    if (initialStudentId && initialStudentId !== activeStudentId) {
      setActiveStudentId(initialStudentId);
    }
  }, [initialStudentId]);

  // Smooth cross-fade transition state (150ms)
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Quiet "Saved" feedback state
  const [recentlySavedId, setRecentlySavedId] = useState<string | null>(null);
  const [savedFlashNotice, setSavedFlashNotice] = useState<string | null>(null);

  // Density setting (Comfortable, Compact) saved per user, default Compact
  const [density, setDensity] = useState<'compact' | 'comfortable'>(() => {
    try {
      const saved = localStorage.getItem('marks_entry_density');
      return saved === 'comfortable' ? 'comfortable' : 'compact';
    } catch {
      return 'compact';
    }
  });

  const toggleDensity = () => {
    const next = density === 'compact' ? 'comfortable' : 'compact';
    setDensity(next);
    try {
      localStorage.setItem('marks_entry_density', next);
    } catch {}
  };

  // Find active records
  const currentClass = classes.find((c) => c.id === classId) || {
    id: classId,
    name: classId,
    order: 0,
    hasStreams: false,
  };

  const currentExam = exams.find((e) => e.id === examId);
  // Shared ordered list strictly by Roll No. numerically ascending
  const examStudentList = useMemo(
    () => getOrderedExamStudents(examId),
    [examId, getOrderedExamStudents]
  );
  const currentStudent = students.find((s) => s.id === activeStudentId);

  // Skip already completed students toggle state
  const [skipCompleted, setSkipCompleted] = useState<boolean>(false);

  // Position in student roster
  const currentIndex = examStudentList.findIndex((s) => s.id === activeStudentId);

  // Completed count in this exam
  const completedCount = useMemo(() => {
    return examStudentList.filter(
      (s) => (marksStatus[`${examId}_${s.id}`] || getMarksStatus(examId, s.id)) === 'completed'
    ).length;
  }, [examStudentList, examId, marksStatus, getMarksStatus]);

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
  const isAlreadyCompleted = getMarksStatus(examId, activeStudentId) === 'completed';

  // Sentinel ref on main student details card for sticky top strip
  const detailsCardRef = useRef<HTMLDivElement>(null);
  const [isScrolledPastDetails, setIsScrolledPastDetails] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!detailsCardRef.current) return;
      const rect = detailsCardRef.current.getBoundingClientRect();
      setIsScrolledPastDetails(rect.bottom < 70);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize marksState from central store marks whenever activeStudentId changes
  useEffect(() => {
    if (!currentStudent || !currentExam) return;

    // Check existing student exam status
    const existingStatus = getStudentExamStatus(examId, activeStudentId);
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
      const subMarks = marks.filter(
        (m) =>
          m.examId === examId &&
          m.studentId === activeStudentId &&
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
  }, [examId, activeStudentId, classSubjects, marks]);

  // Handle single component value change
  const handleMarksChange = (
    subjectId: string,
    component: 'descriptive' | 'practical' | 'ia',
    value: string
  ) => {
    const trimmed = value.trim();
    const errorKey = `${subjectId}_${component}`;

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
      undoStudentAbsentAll(examId, activeStudentId);
      setIsAllAbsentFlag(false);
    } else {
      markStudentAbsentAll(examId, activeStudentId, classSubjects);
      setIsAllAbsentFlag(true);

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
          studentId: activeStudentId,
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

      if (descriptiveMax > 0) {
        const raw = val.descriptive.trim().toUpperCase();
        const absent = raw === 'A';
        const obtained = absent || raw === '' ? null : parseFloat(raw);
        records.push({
          examId,
          studentId: activeStudentId,
          subjectId: sub.id,
          component: 'descriptive',
          obtained,
          absent,
        });
      }

      if (practicalMax > 0) {
        const raw = val.practical.trim().toUpperCase();
        const absent = raw === 'A';
        const obtained = absent || raw === '' ? null : parseFloat(raw);
        records.push({
          examId,
          studentId: activeStudentId,
          subjectId: sub.id,
          component: 'practical',
          obtained,
          absent,
        });
      }

      if (iaMax > 0) {
        const raw = val.ia.trim().toUpperCase();
        const absent = raw === 'A';
        const obtained = absent || raw === '' ? null : parseFloat(raw);
        records.push({
          examId,
          studentId: activeStudentId,
          subjectId: sub.id,
          component: 'ia',
          obtained,
          absent,
        });
      }
    });

    return records;
  };

  // Calculate summary metrics for confirmation modal and live overview
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

  // In-place Student Switcher: Never resets window scroll position
  const switchStudentInPlace = useCallback(
    (
      nextStudent: Student,
      wasSubmitted = false,
      prevStudentInfo?: { rollNo: string; name: string }
    ) => {
      // 1. Brief calm cross-fade in place (150ms)
      setIsTransitioning(true);

      // 2. Soft update URL hash using replaceState so browser history stays intact without scrolling
      const targetHash = `#/marks-entry/${classId}/${examId}/${nextStudent.id}`;
      window.history.replaceState(null, '', targetHash);

      // 3. Swap state in place
      setTimeout(() => {
        setActiveStudentId(nextStudent.id);
        setIsTransitioning(false);

        if (wasSubmitted && prevStudentInfo) {
          setRecentlySavedId(prevStudentInfo.name);
          setSavedFlashNotice(
            `Saved: Roll ${prevStudentInfo.rollNo} ${prevStudentInfo.name}. Now Roll ${nextStudent.rollNo}`
          );
          setTimeout(() => {
            setSavedFlashNotice(null);
            setRecentlySavedId(null);
          }, 3500);
        }
      }, 150);
    },
    [classId, examId]
  );

  // Trigger Submit Confirmation Pop-up
  const handleTriggerSubmit = (mode: 'submit_only' | 'submit_and_next') => {
    if (isReadOnly) {
      addToast('Examination is closed or final submitted. Read-only mode.', 'error');
      return;
    }

    const { isValid, pendingCount } = validateForSubmit();
    if (!isValid) {
      setPendingWarning(
        `${pendingCount} field(s) need attention. Please enter marks or click "Save as draft".`
      );

      // Focus first error input WITHOUT jumping or scrolling to the top!
      setTimeout(() => {
        const firstProblem = document.querySelector<HTMLInputElement>(
          '[data-has-error="true"], select[data-has-error="true"]'
        );
        if (firstProblem) {
          firstProblem.focus({ preventScroll: true });
          const rect = firstProblem.getBoundingClientRect();
          if (rect.top < 80 || rect.bottom > window.innerHeight - 80) {
            firstProblem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
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
        studentId: activeStudentId,
        marks: records,
        isDraft: false,
        includeInNextExam,
        updatedBy: 'Teacher / Exam Incharge',
      });

      // Brief animation for spinner feedback
      await new Promise((resolve) => setTimeout(resolve, 200));

      setIsSubmitting(false);
      setIsConfirmModalOpen(false);

      const prevStudentInfo = {
        rollNo: currentStudent.rollNo || '--',
        name: currentStudent.name,
      };

      if (pendingSubmitAction === 'submit_and_next') {
        const nextStudent = getNextStudent(
          currentStudent,
          examStudentList,
          marksStatus,
          examId,
          skipCompleted
        );

        if (nextStudent) {
          // Switch in place: No page reload, no scroll reset!
          switchStudentInPlace(nextStudent, true, prevStudentInfo);
        } else {
          // Reached end of student list! Never wrap back to Roll 1.
          const firstPendingStudent = examStudentList.find(
            (s) =>
              s.id !== currentStudent.id &&
              (marksStatus[`${examId}_${s.id}`] || getMarksStatus(examId, s.id)) !== 'completed'
          );

          try {
            sessionStorage.setItem('last_edited_student_id', currentStudent.id);
          } catch {}

          if (firstPendingStudent) {
            addToast(
              'All students done up to the last Roll No.',
              'info',
              'Go to first pending student',
              () => {
                switchStudentInPlace(firstPendingStudent);
              },
              10000
            );
          } else {
            addToast('All students done up to the last Roll No.', 'success');
          }
          navigateTo(`/marks-entry/${classId}/${examId}`, { preserveScroll: true });
        }
      } else {
        // 'submit_only' -> return to exam student list preserving scroll and recording last student
        try {
          sessionStorage.setItem('last_edited_student_id', currentStudent.id);
        } catch {}
        addToast(`Marks submitted successfully for ${currentStudent.name}`, 'success');
        navigateTo(`/marks-entry/${classId}/${examId}`, { preserveScroll: true });
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError('Failed to save marks. Please check data and try again.');
    }
  };

  // Save as draft without marking as completed
  const handleSaveDraft = () => {
    if (isReadOnly || !currentStudent) {
      addToast('Examination is closed or final submitted. Read-only mode.', 'error');
      return;
    }

    const records = compileMarkRecords();
    saveCandidateMarks({
      examId,
      studentId: activeStudentId,
      marks: records,
      isDraft: true,
      includeInNextExam,
      updatedBy: 'Teacher / Exam Incharge',
    });

    setRecentlySavedId(currentStudent.name);
    setSavedFlashNotice(`Draft saved: Roll ${currentStudent.rollNo || ''} ${currentStudent.name}`);
    setTimeout(() => {
      setSavedFlashNotice(null);
      setRecentlySavedId(null);
    }, 3000);
  };

  // Navigation between students in same exam (in place, no scroll jump)
  const handleGoToPreviousStudent = () => {
    if (!currentStudent) return;
    if (currentIndex > 0) {
      const prevStudent = examStudentList[currentIndex - 1];
      switchStudentInPlace(prevStudent);
    } else {
      addToast('First candidate in roster reached.', 'info');
    }
  };

  const handleGoToNextStudent = () => {
    if (!currentStudent) return;
    const nextStudent = getNextStudent(
      currentStudent,
      examStudentList,
      marksStatus,
      examId,
      skipCompleted
    );

    if (nextStudent) {
      switchStudentInPlace(nextStudent);
    } else {
      addToast('Reached end of student roster for this examination.', 'info');
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
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Examination List</span>
        </button>
      </div>
    );
  }

  const errorCount = Object.keys(validationErrors).length;

  return (
    <div className={`space-y-3 ${density === 'compact' ? 'pb-24' : 'pb-28'}`}>
      
      {/* Read-Only Banner if Final Submitted or Outside Dates */}
      {isReadOnly && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3 flex items-center gap-2.5 text-amber-900 shadow-2xs">
          {isFinalSubmitted ? (
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          ) : (
            <Clock className="w-4 h-4 text-amber-700 shrink-0" />
          )}
          <div className="text-xs">
            <span className="font-extrabold uppercase tracking-wider mr-2">
              {isFinalSubmitted
                ? 'EXAMINATION FINAL SUBMITTED - READ ONLY MODE'
                : 'EXAMINATION WINDOW CLOSED - READ ONLY MODE'}
            </span>
            <span className="text-slate-600">
              Marks entry is currently locked for editing.
            </span>
          </div>
        </div>
      )}

      {/* STICKY STUDENT STRIP: Appears just under top bar when scrolling past the main card */}
      {isScrolledPastDetails && (
        <div className="fixed top-14 md:top-16 left-0 right-0 md:left-60 z-20 hidden md:flex items-center justify-between bg-white/95 backdrop-blur-md border-b border-teal-200/90 shadow-sm px-4 md:px-6 py-2 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono font-black text-xs bg-teal-100 text-[#0f766e] px-2 py-0.5 rounded border border-teal-200 shrink-0">
              Roll {currentStudent.rollNo || '--'}
            </span>

            <span className="font-bold text-slate-900 uppercase tracking-tight truncate max-w-[200px]">
              {currentStudent.name}
            </span>

            {recentlySavedId === currentStudent.name && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded-full shrink-0">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                <span>Saved</span>
              </span>
            )}

            <span className="text-slate-500 font-medium hidden lg:inline truncate max-w-[200px]">
              Father: <strong className="text-slate-700">{currentStudent.fatherName}</strong>
            </span>

            <span className="text-slate-400 font-mono text-[11px] hidden xl:inline">
              Reg: {currentStudent.registrationNo}
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className="font-bold text-[#0f766e] truncate max-w-[220px] hidden sm:inline">
              {currentExam.name}
            </span>

            {/* In-strip position navigator */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-2 py-0.5">
              <button
                type="button"
                disabled={currentIndex <= 0}
                onClick={handleGoToPreviousStudent}
                className="p-0.5 rounded text-slate-600 hover:text-purple-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Previous Student"
                aria-label="Previous Student"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="text-[11px] font-bold font-mono text-slate-700 px-1 select-none">
                {currentIndex + 1} / {examStudentList.length}
              </span>

              <button
                type="button"
                disabled={currentIndex >= examStudentList.length - 1}
                onClick={handleGoToNextStudent}
                className="p-0.5 rounded text-slate-600 hover:text-purple-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Next Student"
                aria-label="Next Student"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTAINER WITH SMOOTH CROSS-FADE TRANSITION (150ms) */}
      <div className={`space-y-3 transition-opacity duration-150 ${isTransitioning ? 'opacity-35 pointer-events-none' : 'opacity-100'}`}>
        
        {/* 1. STUDENT INFO BAR & ACTIONS (Directly at top of page order) */}
        <div ref={detailsCardRef}>
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
            density={density}
            recentlySaved={recentlySavedId === currentStudent.name}
          />
        </div>

        {/* Pending Validation Warning Banner if any */}
        {pendingWarning && (
          <div className="bg-red-50 border border-red-300 text-red-900 rounded-lg p-2.5 flex items-start gap-2 text-xs animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">
              <span>{pendingWarning}</span>
            </div>
            <button
              type="button"
              onClick={() => setPendingWarning(null)}
              className="text-red-500 hover:text-red-800 text-xs font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 2. MARKS TABLE CARD */}
        <div className="space-y-1.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Subject Scholastic &amp; Co-Scholastic Assessment Part
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              Tab / Enter: next field | Enter 0 if scored zero | Type A if absent
            </span>
          </div>

          <SubjectMarksTable
            subjects={classSubjects}
            exam={currentExam}
            studentId={activeStudentId}
            marksState={marksState}
            onMarksChange={handleMarksChange}
            onGradeChange={handleGradeChange}
            validationErrors={validationErrors}
            disabled={isReadOnly || isAllAbsentFlag}
            density={density}
            onLastInputEnter={() => handleTriggerSubmit('submit_and_next')}
          />
        </div>

        {/* 3. GREY NOTE BOX: ADD STUDENT TO NEXT EXAM */}
        <NextExamSelector
          includeInNextExam={includeInNextExam}
          onChange={setIncludeInNextExam}
          nextExamName={nextExam ? nextExam.name : null}
          disabled={isReadOnly}
        />
      </div>

      {/* 4. STICKY ACTION BAR AT BOTTOM OF SCREEN */}
      <div className="fixed bottom-0 left-0 right-0 md:left-60 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] py-2.5 px-4 md:px-6">
        
        {/* Quiet thin green confirmation flash bar */}
        {savedFlashNotice && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500 animate-pulse" />
        )}

        <div className="flex flex-col lg:flex-row items-center justify-between gap-2.5">
          {/* Left Zone: Live Totals & Error / Saved Feedback */}
          <div className="flex items-center gap-3 flex-wrap font-medium text-xs">
            <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
              <span className="text-slate-500">Obtained:</span>
              <strong className="text-base font-black text-[#0f766e] font-mono">
                {summaryInfo.totalObtained}
              </strong>
              <span className="text-slate-300">/</span>
              <strong className="text-slate-800 font-mono">
                {summaryInfo.totalFullMarks}
              </strong>
              <span className="text-purple-900 font-bold ml-1 font-mono">
                ({summaryInfo.totalFullMarks > 0 ? ((summaryInfo.totalObtained / summaryInfo.totalFullMarks) * 100).toFixed(1) : 0}%)
              </span>
            </div>

            {/* Error count pill */}
            {errorCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 animate-in fade-in">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>{errorCount} field{errorCount === 1 ? '' : 's'} need attention</span>
              </span>
            )}

            {/* Quiet Saved notice */}
            {savedFlashNotice && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{savedFlashNotice}</span>
              </span>
            )}
          </div>

          {/* Middle Zone: Progress counter & Density setting */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              {completedCount} of {examStudentList.length} completed
            </span>

            {/* Skip Completed Checkbox */}
            <label className="hidden sm:inline-flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
              <input
                type="checkbox"
                checked={skipCompleted}
                onChange={(e) => setSkipCompleted(e.target.checked)}
                className="w-3.5 h-3.5 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
              />
              <span className="text-[11px] font-medium">Skip completed</span>
            </label>

            {/* Density switch button */}
            <button
              type="button"
              onClick={toggleDensity}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-[11px] font-medium text-slate-600 cursor-pointer transition-colors"
              title="Toggle table spacing density"
            >
              <SlidersHorizontal className="w-3 h-3 text-slate-500" />
              <span>{density === 'compact' ? 'Compact' : 'Comfortable'}</span>
            </button>
          </div>

          {/* Right Zone: Action Buttons */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            {/* GO BACK button */}
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.setItem('last_edited_student_id', activeStudentId);
                } catch {}
                navigateTo(`/marks-entry/${classId}/${examId}`, { preserveScroll: true });
              }}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>GO BACK</span>
            </button>

            {/* Save as draft */}
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleSaveDraft}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md border border-purple-300 bg-purple-50 hover:bg-purple-100 text-[#7e22ce] text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="Save without marking as completed"
              >
                <FileEdit className="w-3.5 h-3.5 text-[#9333ea]" />
                <span className="hidden sm:inline">Save as draft</span>
                <span className="sm:hidden">Draft</span>
              </button>
            )}

            {/* Plain SUBMIT MARKS */}
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => handleTriggerSubmit('submit_only')}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isAlreadyCompleted ? 'UPDATE' : 'SUBMIT'}</span>
              </button>
            )}

            {/* Primary Default Action: SUBMIT & NEXT STUDENT (Ctrl+Enter) */}
            {!isReadOnly && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleTriggerSubmit('submit_and_next')}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#9333ea] hover:bg-[#7e22ce] text-white text-xs font-black tracking-wide transition-all shadow-sm hover:shadow cursor-pointer ring-2 ring-purple-300/50 disabled:opacity-50"
                title="Submit and immediately open next student (Ctrl+Enter)"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{isAlreadyCompleted ? 'UPDATE & NEXT' : 'SUBMIT & NEXT'}</span>
                <span className="hidden xl:inline text-[9px] bg-purple-900/60 text-purple-200 px-1 py-0.2 rounded font-mono font-normal">
                  Ctrl+Enter
                </span>
              </button>
            )}
          </div>
        </div>
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
                    studentId: activeStudentId,
                    marks: compileMarkRecords(),
                    isDraft: false,
                    includeInNextExam,
                    updatedBy: 'Teacher / Exam Incharge',
                  });
                  handleGoToNextStudent();
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded cursor-pointer"
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
                    studentId: activeStudentId,
                    marks: compileMarkRecords(),
                    isDraft: false,
                    includeInNextExam,
                    updatedBy: 'Teacher / Exam Incharge',
                  });
                  handleGoToNextStudent();
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#9333ea] hover:bg-[#7e22ce] rounded cursor-pointer shadow-xs"
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
