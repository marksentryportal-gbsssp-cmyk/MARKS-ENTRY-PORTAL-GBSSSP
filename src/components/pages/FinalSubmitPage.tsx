import React, { useState, useMemo } from 'react';
import {
  SendHorizontal,
  FileCheck2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Search,
  Filter,
  X,
  Lock,
  Eye,
  ShieldAlert,
  ArrowRight,
  Info,
  Clock,
  Edit2,
  KeyRound,
  FileSpreadsheet,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { ExamRecord, Student, Subject } from '../../types';
import { getExamCompletionStatus, ExamCompletionInfo } from '../../utils/dateUtils';
import { sortByRollNo } from '../../utils/rollNoUtils';

export const FinalSubmitPage: React.FC = () => {
  const {
    classes,
    exams,
    students,
    subjects,
    marks,
    marksStatus,
    studentExamStatuses,
    finalSubmitGuidelines,
    updateFinalSubmitGuidelines,
    finalSubmitExam,
    cancelFinalSubmitExam,
    resultSettings,
    currentUser,
    navigateTo,
    getStudentsForExam,
    addToast,
  } = usePortal();

  // Filters & Search
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [finalSubmitTargetExam, setFinalSubmitTargetExam] = useState<ExamRecord | null>(null);
  const [isFinalSubmitVerified, setIsFinalSubmitVerified] = useState<boolean>(false);
  const [isReviewMarksOpen, setIsReviewMarksOpen] = useState<boolean>(false);

  const [cancelTargetExam, setCancelTargetExam] = useState<ExamRecord | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelPassword, setCancelPassword] = useState<string>('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const [pendingModalExam, setPendingModalExam] = useState<ExamRecord | null>(null);

  // Guidelines edit state
  const [isEditingGuidelines, setIsEditingGuidelines] = useState<boolean>(false);
  const [guidelinesDraft, setGuidelinesDraft] = useState<string[]>(finalSubmitGuidelines);

  // Distinct academic years
  const distinctYears = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((e) => {
      if (e.academicYear) set.add(e.academicYear);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [exams]);

  // Sort classes strictly from Ankur to Twelve by order
  const orderedClasses = useMemo(() => {
    return [...classes].sort((a, b) => a.order - b.order);
  }, [classes]);

  // Compute completion stats for any exam
  const getExamStats = (exam: ExamRecord) => {
    const enrolledStudents = sortByRollNo(getStudentsForExam(exam.id));
    const totalCount = enrolledStudents.length;
    let completedCount = 0;
    let absentCount = 0;

    enrolledStudents.forEach((s) => {
      const statusKey = `${exam.id}_${s.id}`;
      const st = marksStatus[statusKey];
      const examStatus = studentExamStatuses[statusKey];

      if (st === 'completed') {
        completedCount++;
      }
      if (examStatus?.status === 'absent_all') {
        absentCount++;
      }
    });

    const completionInfo: ExamCompletionInfo = getExamCompletionStatus(
      Boolean(exam.isFinalSubmitted),
      completedCount,
      totalCount
    );

    return {
      enrolledStudents,
      totalCount,
      completedCount,
      absentCount,
      completionInfo,
    };
  };

  // Group exams by Class and Academic Year
  interface ClassYearGroup {
    classInfo: (typeof classes)[0];
    academicYear: string;
    exams: ExamRecord[];
  }

  const groupedExamSections = useMemo(() => {
    const groups: ClassYearGroup[] = [];

    // Filter classes
    const classesToProcess =
      selectedClassFilter === 'all'
        ? orderedClasses
        : orderedClasses.filter((c) => c.id === selectedClassFilter);

    classesToProcess.forEach((cls) => {
      // Find all exams for this class
      const classExams = exams.filter((e) => e.classId === cls.id);
      if (classExams.length === 0) return;

      // Collect years for this class
      const yearsInClass = Array.from(
        new Set(classExams.map((e) => e.academicYear))
      ).sort((a, b) => b.localeCompare(a));

      const yearsToProcess =
        selectedYearFilter === 'all'
          ? yearsInClass
          : yearsInClass.filter((y) => y === selectedYearFilter);

      yearsToProcess.forEach((year) => {
        let matchingExams = classExams.filter((e) => e.academicYear === year);

        // Apply search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          matchingExams = matchingExams.filter(
            (e) =>
              e.name.toLowerCase().includes(q) ||
              e.className.toLowerCase().includes(q) ||
              e.examTypeName?.toLowerCase().includes(q)
          );
        }

        if (matchingExams.length > 0) {
          groups.push({
            classInfo: cls,
            academicYear: year,
            exams: matchingExams,
          });
        }
      });
    });

    return groups;
  }, [classes, exams, orderedClasses, selectedClassFilter, selectedYearFilter, searchQuery]);

  // Handler for opening final submit confirmation modal
  const handleOpenFinalSubmit = (exam: ExamRecord) => {
    setFinalSubmitTargetExam(exam);
    setIsFinalSubmitVerified(false);
    setIsReviewMarksOpen(false);
  };

  // Execute Final Submit
  const handleConfirmFinalSubmit = () => {
    if (!finalSubmitTargetExam || !isFinalSubmitVerified) return;
    const res = finalSubmitExam(finalSubmitTargetExam.id);
    if (res.success) {
      setFinalSubmitTargetExam(null);
    }
  };

  // Handler for opening cancel final submit modal
  const handleOpenCancelSubmit = (exam: ExamRecord) => {
    const permission = resultSettings.whoCanCancelFinalSubmit || 'admin_only';
    if (permission === 'admin_only' && currentUser?.role !== 'admin') {
      addToast('Only administrators are authorized to cancel Final Submit.', 'error');
      return;
    }

    setCancelTargetExam(exam);
    setCancelReason('');
    setCancelPassword('');
    setCancelError(null);
  };

  // Execute Cancel Final Submit
  const handleConfirmCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTargetExam) return;

    if (!cancelReason.trim() || cancelReason.trim().length < 5) {
      setCancelError('Please enter a specific reason (at least 5 characters).');
      return;
    }

    if (!cancelPassword) {
      setCancelError('Please enter your login password.');
      return;
    }

    setIsCancelling(true);
    setCancelError(null);

    const res = await cancelFinalSubmitExam(
      cancelTargetExam.id,
      cancelReason.trim(),
      cancelPassword
    );

    setIsCancelling(false);

    if (res.success) {
      setCancelTargetExam(null);
    } else {
      setCancelError(res.error || 'Failed to cancel Final Submit.');
    }
  };

  // Guidelines save
  const handleSaveGuidelines = () => {
    updateFinalSubmitGuidelines(guidelinesDraft.filter((g) => g.trim().length > 0));
    setIsEditingGuidelines(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. GUIDELINES FOR FINAL SUBMIT White Card */}
      <section
        aria-labelledby="final-submit-guidelines-heading"
        className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 md:p-6"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <SendHorizontal className="w-5 h-5 text-[#0f766e]" />
            <h2
              id="final-submit-guidelines-heading"
              className="text-[#0f766e] font-extrabold text-sm md:text-base tracking-wide uppercase"
            >
              GUIDELINES FOR FINAL SUBMIT:
            </h2>
          </div>

          {currentUser?.role === 'admin' && (
            <button
              type="button"
              onClick={() => {
                if (isEditingGuidelines) {
                  handleSaveGuidelines();
                } else {
                  setGuidelinesDraft([...finalSubmitGuidelines]);
                  setIsEditingGuidelines(true);
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded border border-teal-200 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditingGuidelines ? 'Save Guidelines' : 'Edit Guidelines'}</span>
            </button>
          )}
        </div>

        {isEditingGuidelines ? (
          <div className="space-y-2 mt-3">
            {guidelinesDraft.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">{idx + 1}.</span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const updated = [...guidelinesDraft];
                    updated[idx] = e.target.value;
                    setGuidelinesDraft(updated);
                  }}
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded focus:border-teal-600 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setGuidelinesDraft(guidelinesDraft.filter((_, i) => i !== idx))}
                  className="p-1 text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGuidelinesDraft([...guidelinesDraft, ''])}
                className="text-xs text-teal-700 font-semibold hover:underline"
              >
                + Add Guideline Bullet
              </button>
              <button
                type="button"
                onClick={() => setIsEditingGuidelines(false)}
                className="text-xs text-slate-500 hover:underline ml-auto"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700 leading-relaxed">
            {finalSubmitGuidelines.map((guideline, idx) => (
              <li key={idx} className="marker:text-[#0f766e]">
                {guideline}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 2. FILTERS AND SEARCH BAR */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-class" className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-teal-700" />
              <span>Class:</span>
            </label>
            <select
              id="filter-class"
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-md py-1.5 px-2.5 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-600 font-medium"
            >
              <option value="all">All Classes</option>
              {orderedClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  Class {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year Filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-year" className="text-xs font-semibold text-slate-600">
              Academic Year:
            </label>
            <select
              id="filter-year"
              value={selectedYearFilter}
              onChange={(e) => setSelectedYearFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-md py-1.5 px-2.5 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-600 font-mono"
            >
              <option value="all">All Sessions</option>
              {distinctYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Box */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search examination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-600 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. LIST OF EXAMINATIONS GROUPED BY CLASS AND ACADEMIC YEAR */}
      {groupedExamSections.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500 text-xs">
          No examination records found matching the active filters.
        </div>
      ) : (
        groupedExamSections.map((group) => (
          <section
            key={`${group.classInfo.id}-${group.academicYear}`}
            className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 md:p-6 space-y-4"
          >
            {/* Group Header: List of Examinations Class <ClassName> <AcademicYear> */}
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-[#0f766e] font-extrabold text-base md:text-lg tracking-tight">
                  List of Examinations Class {group.classInfo.name} {group.academicYear}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Final submission status and board lock controls for Class {group.classInfo.name}
                </p>
              </div>

              <span className="text-xs font-mono bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 rounded font-semibold">
                {group.exams.length} Examination{group.exams.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 select-none">
                    <th className="py-2.5 px-3 border-r border-slate-200 text-left min-w-[200px]">
                      Exam Name
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-200 min-w-[70px]">
                      Class
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-200 min-w-[95px]">
                      Academic Year
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-200 min-w-[90px]">
                      Start date
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-200 min-w-[90px]">
                      End date
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-200 min-w-[190px]">
                      Status
                    </th>
                    <th className="py-2.5 px-4 min-w-[180px]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {group.exams.map((exam) => {
                    const stats = getExamStats(exam);
                    const { completionInfo } = stats;
                    const isSubmitted = Boolean(exam.isFinalSubmitted);
                    const isComplete = completionInfo.status === 'completed';

                    // Permission check for cancellation button
                    const canCancel =
                      currentUser?.role === 'admin' ||
                      resultSettings.whoCanCancelFinalSubmit === 'admin_and_teachers';

                    return (
                      <tr
                        key={exam.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Exam Name */}
                        <td className="py-2.5 px-3 border-r border-slate-200 text-left font-semibold text-slate-800">
                          <div>
                            <span>{exam.name}</span>
                            {exam.cancelHistory && exam.cancelHistory.length > 0 && !isSubmitted && (
                              <span
                                className="block text-[10px] text-amber-700 font-medium mt-0.5"
                                title={`Reopened on ${exam.cancelHistory[0].cancelledAt}: ${exam.cancelHistory[0].reason}`}
                              >
                                [Reopened: {exam.cancelHistory[0].reason}]
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Class */}
                        <td className="py-2.5 px-3 border-r border-slate-200 text-slate-700 font-medium">
                          {exam.className}
                        </td>

                        {/* Academic Year */}
                        <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-slate-600">
                          {exam.academicYear}
                        </td>

                        {/* Start date */}
                        <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-slate-600">
                          {exam.startDate}
                        </td>

                        {/* End date */}
                        <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-slate-600">
                          {exam.endDate}
                        </td>

                        {/* Status Column */}
                        <td className="py-2.5 px-3 border-r border-slate-200">
                          <span className={`inline-block ${completionInfo.colorClass}`}>
                            {completionInfo.label}
                          </span>
                        </td>

                        {/* Action Column */}
                        <td className="py-2.5 px-4 text-center">
                          {isSubmitted ? (
                            <button
                              type="button"
                              onClick={() => handleOpenCancelSubmit(exam)}
                              disabled={!canCancel}
                              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer border ${
                                canCancel
                                  ? 'border-red-500 text-[#b91c1c] hover:bg-red-50'
                                  : 'border-slate-300 text-slate-400 bg-slate-50 cursor-not-allowed'
                              }`}
                              title={
                                canCancel
                                  ? 'Cancel final submit and reopen exam for marks corrections'
                                  : 'Only school administrators can cancel Final Submit'
                              }
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>CANCEL FINAL SUBMIT</span>
                            </button>
                          ) : isComplete ? (
                            <button
                              type="button"
                              onClick={() => handleOpenFinalSubmit(exam)}
                              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1 rounded text-xs font-bold border border-[#0f766e] text-[#0f766e] hover:bg-teal-50 transition-colors shadow-2xs cursor-pointer"
                              title="Confirm marks and final submit to lock this exam"
                            >
                              <SendHorizontal className="w-3.5 h-3.5" />
                              <span>Final Submit</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPendingModalExam(exam)}
                              className="text-xs text-slate-500 hover:text-teal-700 underline font-medium cursor-pointer"
                              title="Click to view list of pending students"
                            >
                              View pending students ({completionInfo.pendingCount})
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      {/* 4. MODAL: FINAL SUBMIT CONFIRMATION */}
      {finalSubmitTargetExam && (() => {
        const stats = getExamStats(finalSubmitTargetExam);
        const classSubs = subjects.filter(
          (s) => s.classId === finalSubmitTargetExam.classId && !s.hidden
        );

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-4 md:p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm md:text-base">
                    Final Submit Confirmation - {finalSubmitTargetExam.name}
                  </h3>
                  <p className="text-xs text-teal-300 mt-0.5">
                    Class: {finalSubmitTargetExam.className} | Session: {finalSubmitTargetExam.academicYear}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFinalSubmitTargetExam(null)}
                  className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 md:p-6 space-y-4">
                {/* Stats Summary Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">Enrolled</div>
                    <div className="text-base font-black font-mono text-slate-800">
                      {stats.totalCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-emerald-700 font-medium">Completed</div>
                    <div className="text-base font-black font-mono text-emerald-700">
                      {stats.completedCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-amber-700 font-medium">Absent (All)</div>
                    <div className="text-base font-black font-mono text-amber-700">
                      {stats.absentCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-teal-700 font-medium">Subjects</div>
                    <div className="text-base font-black font-mono text-teal-800">
                      {classSubs.length}
                    </div>
                  </div>
                </div>

                {/* Review Marks Summary toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setIsReviewMarksOpen(!isReviewMarksOpen)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0f766e] hover:underline cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{isReviewMarksOpen ? 'Hide marks review' : 'Review marks summary for this class'}</span>
                  </button>

                  {isReviewMarksOpen && (
                    <div className="mt-2.5 max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50 text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                            <th className="py-1 px-2">Roll</th>
                            <th className="py-1 px-2">Name</th>
                            <th className="py-1 px-2">Father Name</th>
                            <th className="py-1 px-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {stats.enrolledStudents.map((s) => (
                            <tr key={s.id} className="hover:bg-white">
                              <td className="py-1 px-2 font-mono font-bold text-slate-800">
                                {s.rollNo}
                              </td>
                              <td className="py-1 px-2 font-semibold text-slate-800 uppercase">
                                {s.name}
                              </td>
                              <td className="py-1 px-2 text-slate-500">
                                {s.fatherName}
                              </td>
                              <td className="py-1 px-2 text-center font-bold text-emerald-700">
                                Completed
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Lock Warning */}
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Lock Notice: </strong> Once final submitted, marks entry for this exam will be immediately locked in read-only mode across all devices. If corrections are needed later, an administrator can use <em>Cancel Final Submit</em>.
                  </div>
                </div>

                {/* Verification Checkbox */}
                <label className="flex items-start gap-2.5 p-3 bg-slate-100/80 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={isFinalSubmitVerified}
                    onChange={(e) => setIsFinalSubmitVerified(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-[#0f766e] rounded border-slate-300 focus:ring-teal-500"
                  />
                  <span className="text-xs font-semibold text-slate-800 leading-snug select-none">
                    I have verified the marks entered for each student and confirm they are accurate. I understand this will lock editing for this exam.
                  </span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setFinalSubmitTargetExam(null)}
                  className="px-4 py-2 rounded-lg bg-[#9333ea] hover:bg-[#7e22ce] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  disabled={!isFinalSubmitVerified}
                  onClick={handleConfirmFinalSubmit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#e11d48] hover:bg-[#be123c] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  <SendHorizontal className="w-4 h-4" />
                  <span>Final Submit</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 5. MODAL: CANCEL FINAL SUBMIT */}
      {cancelTargetExam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-red-900 text-white p-4 md:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-300" />
                <div>
                  <h3 className="font-bold text-sm md:text-base">
                    Cancel Final Submit - {cancelTargetExam.name}
                  </h3>
                  <p className="text-xs text-red-200 mt-0.5">
                    Class: {cancelTargetExam.className}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelTargetExam(null)}
                className="p-1 rounded text-red-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmCancelSubmit}>
              <div className="p-5 md:p-6 space-y-4">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 leading-relaxed">
                  Cancelling Final Submit will unlock this examination for marks correction. Marksheets and results will automatically recalculate with any corrected marks.
                </div>

                {cancelError && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-amber-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{cancelError}</span>
                  </div>
                )}

                {/* Reason */}
                <div>
                  <label
                    htmlFor="cancel-reason"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Reason for Cancellation <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="cancel-reason"
                    type="text"
                    required
                    placeholder="e.g. Correction in Mathematics marks of Roll 05"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Minimum 5 characters. This will be recorded in the audit history.
                  </p>
                </div>

                {/* Password confirmation */}
                <div>
                  <label
                    htmlFor="cancel-password"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Confirm Login Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="cancel-password"
                      type="password"
                      required
                      placeholder="Enter your login password"
                      value={cancelPassword}
                      onChange={(e) => setCancelPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCancelTargetExam(null)}
                  className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Dismiss
                </button>

                <button
                  type="submit"
                  disabled={isCancelling}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isCancelling ? 'Verifying...' : 'Confirm Cancellation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: VIEW PENDING STUDENTS */}
      {pendingModalExam && (() => {
        const stats = getExamStats(pendingModalExam);
        const pendingStudents = stats.enrolledStudents.filter((s) => {
          const key = `${pendingModalExam.id}_${s.id}`;
          return marksStatus[key] !== 'completed';
        });

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-slate-900 text-white p-4 md:p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm md:text-base">
                    Pending Students ({pendingStudents.length})
                  </h3>
                  <p className="text-xs text-amber-300 mt-0.5">
                    {pendingModalExam.name} - Class {pendingModalExam.className}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingModalExam(null)}
                  className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 md:p-6 max-h-96 overflow-y-auto">
                {pendingStudents.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-4">
                    All enrolled students have completed marks entry!
                  </p>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px] bg-slate-50">
                        <th className="py-2 px-3">Roll No.</th>
                        <th className="py-2 px-3">Student Name</th>
                        <th className="py-2 px-3">Father Name</th>
                        <th className="py-2 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {pendingStudents.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {s.rollNo}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-800 uppercase">
                            {s.name}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {s.fatherName}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setPendingModalExam(null);
                                navigateTo(
                                  `/marks-entry/${pendingModalExam.classId}/${pendingModalExam.id}/${s.id}`
                                );
                              }}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#0f766e] hover:underline cursor-pointer"
                            >
                              <span>Enter Marks</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPendingModalExam(null)}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
