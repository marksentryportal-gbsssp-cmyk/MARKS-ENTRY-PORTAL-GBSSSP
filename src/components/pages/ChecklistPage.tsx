import React, { useState, useMemo, useRef } from 'react';
import {
  ListChecks,
  ArrowLeft,
  Search,
  Filter,
  Printer,
  FileSpreadsheet,
  FileDown,
  Cloud,
  BookmarkPlus,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lock,
  ExternalLink,
  Trash2,
  Eye,
  RefreshCw,
  Edit,
  CheckSquare,
  Square,
  Info,
  Calendar,
  Layers,
  FileBadge,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { ExamRecord, Student, Subject, ChecklistSnapshot, MarkComponentType } from '../../types';
import {
  buildChecklistData,
  exportChecklistToExcel,
  ChecklistData,
  StudentChecklistRow,
} from '../../utils/checklistUtils';
import { SchoolLogo } from '../common/SchoolLogo';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const ChecklistPage: React.FC = () => {
  const {
    currentRoute,
    classes,
    exams,
    students,
    examStudents,
    subjects,
    marks,
    marksStatus,
    studentExamStatuses,
    resultSettings,
    schoolInfo,
    currentUser,
    checklistSnapshots,
    saveChecklistSnapshot,
    deleteChecklistSnapshot,
    uploadChecklistToDrive,
    navigateTo,
    addToast,
  } = usePortal();

  // If an examId is specified in URL, render the Exam Checklist view (/checklist/:examId)
  if (currentRoute.examId) {
    return <ExamChecklistView examId={currentRoute.examId} />;
  }

  // Otherwise, render the Checklist List & Archive view (/checklist)
  return <ChecklistListView />;
};

/* =========================================================================
 * 1. CHECKLIST LIST & ARCHIVE VIEW (/checklist)
 * ========================================================================= */
const ChecklistListView: React.FC = () => {
  const {
    classes,
    exams,
    students,
    examStudents,
    marksStatus,
    studentExamStatuses,
    schoolInfo,
    currentUser,
    checklistSnapshots,
    deleteChecklistSnapshot,
    navigateTo,
    addToast,
  } = usePortal();

  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [archiveSearchQuery, setArchiveSearchQuery] = useState<string>('');
  const [snapshotToDelete, setSnapshotToDelete] = useState<ChecklistSnapshot | null>(null);

  // Distinct academic years
  const distinctYears = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((e) => {
      if (e.academicYear) set.add(e.academicYear);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [exams]);

  // Order classes strictly from Ankur to Twelve by order property
  const orderedClasses = useMemo(() => {
    return [...classes].sort((a, b) => a.order - b.order);
  }, [classes]);

  // Group exams by Class and Academic Year
  interface ClassYearGroup {
    classInfo: (typeof classes)[0];
    academicYear: string;
    exams: ExamRecord[];
  }

  const groupedExamSections = useMemo(() => {
    const groups: ClassYearGroup[] = [];

    const classesToProcess =
      selectedClassFilter === 'all'
        ? orderedClasses
        : orderedClasses.filter((c) => c.id === selectedClassFilter);

    classesToProcess.forEach((cls) => {
      const classExams = exams.filter((e) => e.classId === cls.id);
      if (classExams.length === 0) return;

      const yearsInClass = Array.from(
        new Set(classExams.map((e) => e.academicYear))
      ).sort((a, b) => b.localeCompare(a));

      const yearsToProcess =
        selectedYearFilter === 'all'
          ? yearsInClass
          : yearsInClass.filter((y) => y === selectedYearFilter);

      yearsToProcess.forEach((year) => {
        let matchingExams = classExams.filter((e) => e.academicYear === year);

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

  // Filtered archived snapshots
  const filteredSnapshots = useMemo(() => {
    if (!archiveSearchQuery.trim()) return checklistSnapshots;
    const q = archiveSearchQuery.toLowerCase().trim();
    return checklistSnapshots.filter(
      (s) =>
        s.examName.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q) ||
        s.academicYear.toLowerCase().includes(q) ||
        s.savedBy.toLowerCase().includes(q) ||
        (s.note && s.note.toLowerCase().includes(q))
    );
  }, [checklistSnapshots, archiveSearchQuery]);

  const handleDeleteSnapshot = () => {
    if (!snapshotToDelete) return;
    deleteChecklistSnapshot(snapshotToDelete.id);
    setSnapshotToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-teal-50 text-[#0f766e] border border-teal-100">
              <ListChecks className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Checklist for Examinations</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  Verification & Records
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {schoolInfo.name} • ASSEB-DI: {schoolInfo.code} • UDISE: {schoolInfo.udiseCode}
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'active'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              <span>Active Examinations</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                {exams.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('archive')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'archive'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileBadge className="w-3.5 h-3.5 text-teal-600" />
              <span>Checklist Archive</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                {checklistSnapshots.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: ACTIVE EXAMINATIONS */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Class Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-medium text-slate-600">Class:</span>
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="text-xs font-medium bg-slate-50 border border-slate-300 text-slate-700 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                >
                  <option value="all">All Classes (Ankur to XII)</option>
                  {orderedClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Class {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Academic Year Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Year:</span>
                <select
                  value={selectedYearFilter}
                  onChange={(e) => setSelectedYearFilter(e.target.value)}
                  className="text-xs font-medium bg-slate-50 border border-slate-300 text-slate-700 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                >
                  <option value="all">All Academic Years</option>
                  {distinctYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {(selectedClassFilter !== 'all' || selectedYearFilter !== 'all' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClassFilter('all');
                    setSelectedYearFilter('all');
                    setSearchQuery('');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium underline px-1"
                >
                  Reset filters
                </button>
              )}
            </div>

            {/* Search Box */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search examination..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>
          </div>

          {/* Grouped Exam Tables by Class & Year */}
          {groupedExamSections.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-12 text-center">
              <ListChecks className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No examinations found</p>
              <p className="text-xs text-slate-500 mt-1">
                Try adjusting the class filter, academic year, or search term.
              </p>
            </div>
          ) : (
            groupedExamSections.map((group) => (
              <div
                key={`${group.classInfo.id}_${group.academicYear}`}
                className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Section Header: Teal bold heading with thin divider */}
                <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#0f766e] tracking-tight">
                    Checklist for Examinations Class {group.classInfo.name} {group.academicYear}
                  </h2>
                  <span className="text-xs text-slate-500 font-mono">
                    {group.exams.length} examination(s)
                  </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100/70 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4 text-slate-800">Exam Name</th>
                        <th className="py-2.5 px-4 text-center">Class</th>
                        <th className="py-2.5 px-4 text-center">Academic Year</th>
                        <th className="py-2.5 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {group.exams.map((exam) => {
                        const isFinal = Boolean(exam.isFinalSubmitted);
                        return (
                          <tr
                            key={exam.id}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            {/* Exam Name with Status Pill */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="font-semibold text-slate-800">
                                  {exam.name}
                                </span>
                                {isFinal ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>Final Submitted</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>Draft / Marks in progress</span>
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Class */}
                            <td className="py-3 px-4 text-center font-medium text-slate-700">
                              Class {exam.className}
                            </td>

                            {/* Academic Year */}
                            <td className="py-3 px-4 text-center font-mono text-slate-600">
                              {exam.academicYear}
                            </td>

                            {/* Action: Outlined teal button */}
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => navigateTo(`/checklist/${exam.id}`)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-[#0f766e] hover:text-white border border-[#0f766e] hover:bg-[#0f766e] transition-colors shadow-2xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Click to view checklist</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: CHECKLIST ARCHIVE & SNAPSHOTS */}
      {activeTab === 'archive' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Archived Checklist Snapshots</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatic snapshots created during Final Submit / Cancel, plus manual snapshots saved by teachers.
              </p>
            </div>
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search archive..."
                value={archiveSearchQuery}
                onChange={(e) => setArchiveSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            {filteredSnapshots.length === 0 ? (
              <div className="p-12 text-center">
                <BookmarkPlus className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No archived snapshots yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  When exams are final submitted, a snapshot is preserved automatically. You can also save a snapshot manually from any examination checklist.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100/70 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4">Examination</th>
                      <th className="py-2.5 px-4 text-center">Academic Year</th>
                      <th className="py-2.5 px-4 text-center">Saved Date & Time</th>
                      <th className="py-2.5 px-4">Saved By</th>
                      <th className="py-2.5 px-4">Note / Reason</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {filteredSnapshots.map((snap) => (
                      <tr key={snap.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <div>{snap.examName}</div>
                          <div className="text-[11px] text-slate-500 font-normal">
                            Class {snap.className} • {snap.totalStudents} students
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-600">
                          {snap.academicYear}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-600">
                          {snap.timestamp}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {snap.savedBy}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={snap.note}>
                          {snap.note || '--'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {snap.isFinalSubmitted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Final Submitted</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-2.5 h-2.5" />
                              <span>Draft</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => navigateTo(`/checklist/${snap.examId}`)}
                              className="p-1.5 rounded-md hover:bg-teal-50 text-[#0f766e] transition-colors"
                              title="Open Exam Checklist"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {snap.driveFileUrl && (
                              <a
                                href={snap.driveFileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors"
                                title="Open in Google Drive"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}

                            {currentUser?.role === 'admin' && (
                              <button
                                type="button"
                                onClick={() => setSnapshotToDelete(snap)}
                                className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600 transition-colors"
                                title="Delete Archived Snapshot"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Snapshot Confirmation Modal */}
      {snapshotToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-rose-50 text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Delete Archived Snapshot?
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Are you sure you want to permanently remove this snapshot for{' '}
                  <span className="font-semibold text-slate-800">{snapshotToDelete.examName}</span> saved on{' '}
                  <span className="font-mono text-slate-800">{snapshotToDelete.timestamp}</span>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSnapshotToDelete(null)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSnapshot}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-2xs"
              >
                Delete Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
 * 2. INDIVIDUAL EXAM CHECKLIST VIEW (/checklist/:examId)
 * ========================================================================= */
interface ExamChecklistViewProps {
  examId: string;
}

const ExamChecklistView: React.FC<ExamChecklistViewProps> = ({ examId }) => {
  const {
    exams,
    students,
    examStudents,
    subjects,
    marks,
    marksStatus,
    studentExamStatuses,
    resultSettings,
    schoolInfo,
    currentUser,
    saveChecklistSnapshot,
    uploadChecklistToDrive,
    navigateTo,
    addToast,
  } = usePortal();

  const printContainerRef = useRef<HTMLDivElement>(null);

  // Layout mode: 'block' (student-wise blocks, reference style) vs 'compact' (one row per student)
  const [layoutMode, setLayoutMode] = useState<'block' | 'compact'>('block');

  // Display options
  const [showTotals, setShowTotals] = useState<boolean>(
    resultSettings.showTotalsInChecklist !== false
  );
  const [showPendingOnly, setShowPendingOnly] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Selected students for print / export (default all selected)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState<boolean>(true);

  // Snapshot modal state
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState<boolean>(false);
  const [snapshotNote, setSnapshotNote] = useState<string>('');
  const [isSavingSnapshot, setIsSavingSnapshot] = useState<boolean>(false);

  // Drive upload state
  const [isUploadingToDrive, setIsUploadingToDrive] = useState<boolean>(false);

  // PDF generation state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Find target exam
  const exam = useMemo(() => exams.find((e) => e.id === examId), [exams, examId]);

  // Build checklist data
  const checklistData = useMemo<ChecklistData | null>(() => {
    if (!exam) return null;
    return buildChecklistData(
      exam,
      students,
      examStudents,
      subjects,
      marks,
      studentExamStatuses,
      marksStatus
    );
  }, [exam, students, examStudents, subjects, marks, studentExamStatuses, marksStatus]);

  // Synchronize selection set when data loads or changes
  React.useEffect(() => {
    if (checklistData) {
      const allIds = new Set(checklistData.students.map((s) => s.student.id));
      setSelectedStudentIds(allIds);
      setIsAllSelected(true);
    }
  }, [checklistData?.students.length]);

  if (!exam || !checklistData) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-8 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Examination Not Found</h2>
        <p className="text-xs text-slate-600">
          The requested examination (ID: {examId}) could not be located in the portal.
        </p>
        <div>
          <button
            type="button"
            onClick={() => navigateTo('/checklist')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f766e] hover:bg-[#115e59] text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Checklist List</span>
          </button>
        </div>
      </div>
    );
  }

  // Filter students based on search query, pending status, and selection
  const filteredStudents = checklistData.students.filter((st) => {
    if (showPendingOnly && st.isCompleted && !st.hasErrors) {
      return false;
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      const matchName = st.name.toLowerCase().includes(q);
      const matchRoll = st.rollNo.toLowerCase().includes(q);
      const matchReg = st.registrationNo.toLowerCase().includes(q);
      const matchFather = st.fatherName.toLowerCase().includes(q);
      if (!matchName && !matchRoll && !matchReg && !matchFather) return false;
    }
    return true;
  });

  // Students to render in print/PDF (only selected ones)
  const studentsToRender = filteredStudents.filter((st) =>
    selectedStudentIds.has(st.student.id)
  );

  const toggleSelectStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      setIsAllSelected(next.size === checklistData.students.length);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudentIds(new Set());
      setIsAllSelected(false);
    } else {
      const allIds = new Set(checklistData.students.map((s) => s.student.id));
      setSelectedStudentIds(allIds);
      setIsAllSelected(true);
    }
  };

  // Actions
  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportChecklistToExcel(checklistData);
    addToast('Checklist Excel sheet exported successfully', 'success');
  };

  const handleDownloadPdf = async () => {
    const element = printContainerRef.current;
    if (!element) return;
    setIsGeneratingPdf(true);
    try {
      // Temporarily ensure high fidelity rendering
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `Checklist_${exam.className}_${exam.name.replace(/[^a-zA-Z0-9]/g, '_')}_${exam.academicYear}.pdf`;
      pdf.save(filename);
      addToast('Checklist PDF downloaded successfully', 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      addToast('Could not generate PDF directly. Please use the Print button to Save as PDF.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSaveToDrive = async () => {
    setIsUploadingToDrive(true);
    try {
      const res = await uploadChecklistToDrive(exam.id);
      addToast(`Checklist archived to Google Drive: ${res.folderPath}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to upload checklist to Drive', 'error');
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const handleConfirmSaveSnapshot = () => {
    setIsSavingSnapshot(true);
    try {
      const note = snapshotNote.trim() || 'Manual checklist snapshot';
      const snap = saveChecklistSnapshot(exam.id, note);
      if (snap) {
        addToast('Checklist snapshot preserved in archive', 'success');
        setIsSnapshotModalOpen(false);
        setSnapshotNote('');
      } else {
        addToast('Failed to create snapshot', 'error');
      }
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  const isFinalSubmitted = Boolean(exam.isFinalSubmitted);

  return (
    <div className="space-y-5">
      {/* 1. STICKY TOP TOOLBAR (Hidden in Print) */}
      <div className="print:hidden sticky top-0 z-20 bg-white/95 backdrop-blur-md rounded-lg border border-slate-200 shadow-sm p-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Left: Back & Title info */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigateTo('/checklist')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 hover:text-[#0f766e] hover:bg-slate-100 border border-slate-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to list</span>
          </button>

          <div className="hidden sm:block border-l border-slate-300 h-5" />

          {/* Layout Switcher */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setLayoutMode('block')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                layoutMode === 'block'
                  ? 'bg-white text-[#0f766e] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Reference student-wise blocks layout"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Student-wise blocks</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('compact')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                layoutMode === 'compact'
                  ? 'bg-white text-[#0f766e] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Compact one row per student table"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Compact table</span>
            </button>
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Save snapshot */}
          <button
            type="button"
            onClick={() => setIsSnapshotModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Preserve a permanent archival snapshot"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-purple-600" />
            <span>Save snapshot</span>
          </button>

          {/* Save to Drive */}
          <button
            type="button"
            onClick={handleSaveToDrive}
            disabled={isUploadingToDrive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-60"
            title="Archive copy to Google Drive"
          >
            <Cloud className="w-3.5 h-3.5 text-blue-600" />
            <span>{isUploadingToDrive ? 'Archiving...' : 'Save to Drive'}</span>
          </button>

          {/* Download Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Download Excel Spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          {/* Download PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 transition-colors shadow-2xs disabled:opacity-60"
            title="Generate and Download PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-rose-400" />
            <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold text-white bg-[#0f766e] hover:bg-[#115e59] transition-colors shadow-2xs"
            title="Print or Save as PDF via Browser"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* 2. PAGE TITLE & SUMMARY BANNER (Screen display) */}
      <div className="print:hidden bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-4">
        {/* Title row */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-[#0f766e] tracking-tight">
              Checklist for Examination {exam.name}
            </h1>
            <div>
              {isFinalSubmitted ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Final Submitted & Locked</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Draft / Verification in Progress</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
            <span>Class: <strong className="text-slate-700">{exam.className}</strong></span>
            <span>•</span>
            <span>Academic Year: <strong className="text-slate-700">{exam.academicYear}</strong></span>
            <span>•</span>
            <span>Schedule: <strong className="text-slate-700">{exam.startDate}</strong> to <strong className="text-slate-700">{exam.endDate}</strong></span>
            <span>•</span>
            <span>School Code: <strong className="text-slate-700">{schoolInfo.code}</strong></span>
          </div>
          <hr className="mt-3 border-slate-200" />
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Enrolled</p>
            <p className="text-lg font-black text-slate-800">{checklistData.stats.totalEnrolled}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Completed</p>
            <p className="text-lg font-black text-emerald-700">{checklistData.stats.completedCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Pending</p>
            <p className="text-lg font-black text-amber-700">{checklistData.stats.pendingCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
            <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Absent All</p>
            <p className="text-lg font-black text-rose-700">{checklistData.stats.absentCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
            <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">Discrepancies</p>
            <p className="text-lg font-black text-purple-700">{checklistData.stats.discrepancyCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200">
            <p className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider">Status</p>
            <p className="text-xs font-bold text-teal-800 mt-1">
              {isFinalSubmitted ? 'LOCKED' : 'DRAFT'}
            </p>
          </div>
        </div>

        {/* Options & Filter Bar */}
        <div className="pt-2 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={showTotals}
                onChange={(e) => setShowTotals(e.target.checked)}
                className="w-4 h-4 rounded text-[#0f766e] focus:ring-teal-500 border-slate-300"
              />
              <span>Show totals & percentage</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={showPendingOnly}
                onChange={(e) => setShowPendingOnly(e.target.checked)}
                className="w-4 h-4 rounded text-[#0f766e] focus:ring-teal-500 border-slate-300"
              />
              <span className="text-amber-700 font-semibold">Show pending / error candidates only</span>
            </label>

            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium"
            >
              {isAllSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-[#0f766e]" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{isAllSelected ? 'Deselect all for print' : 'Select all for print'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 font-mono">
              Showing {studentsToRender.length} of {checklistData.students.length} students
            </span>
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidate..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. PRINTABLE & PDF EXPORT DOCUMENT CONTAINER */}
      <div
        ref={printContainerRef}
        id="checklist-print-root"
        className="print-area bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-6 print:p-0 print:border-none print:shadow-none max-w-full text-slate-900 font-sans"
      >
        {/* Printable Official Document Header */}
        <div className="pb-4 mb-4 border-b-2 border-slate-800 text-center relative">
          {/* Watermark for draft verification */}
          {!isFinalSubmitted && (
            <div className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold py-1 px-3 mb-2 rounded text-center tracking-wider uppercase">
              *** DRAFT CHECKLIST - FOR SCRUTINY & VERIFICATION ONLY - NOT FINAL SUBMITTED ***
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center">
              <SchoolLogo size="sm" editable={false} />
            </div>

            <div className="flex-1 text-center">
              <p className="text-[11px] sm:text-xs font-bold text-slate-600 tracking-wider uppercase">
                {schoolInfo.boardName}
              </p>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase leading-snug">
                {schoolInfo.name}
              </h2>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-600">
                P.O. PAGLAHAT, DIST: DHUBRI (ASSAM) - PIN: 783334
              </p>
              <div className="mt-1 flex items-center justify-center gap-3 text-[10px] font-mono font-bold text-slate-700">
                <span>ASSEB CODE: {schoolInfo.code}</span>
                <span>•</span>
                <span>UDISE CODE: {schoolInfo.udiseCode}</span>
                <span>•</span>
                <span>SESSION: {exam.academicYear}</span>
              </div>
            </div>

            <div className="w-14 sm:w-16 shrink-0 text-right text-[10px] font-mono text-slate-500">
              <div>Date: {new Date().toLocaleDateString('en-GB')}</div>
              <div className="mt-1 text-[9px] font-bold text-teal-800 border border-teal-700/50 px-1 py-0.5 rounded text-center">
                CHECKLIST
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-300 flex items-center justify-between text-xs">
            <div className="font-bold text-[#0f766e]">
              EXAMINATION: {exam.name.toUpperCase()} (CLASS {exam.className.toUpperCase()})
            </div>
            <div className="text-[11px] text-slate-600 font-mono">
              Dates: {exam.startDate} to {exam.endDate} • Total Candidates: {checklistData.stats.totalEnrolled}
            </div>
          </div>
        </div>

        {/* 4. MAIN CHECKLIST CONTENT */}
        {studentsToRender.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-semibold">
            No candidate records match the active criteria or filter.
          </div>
        ) : layoutMode === 'block' ? (
          /* =========================================================================
           * LAYOUT A: STUDENT-WISE BLOCKS (REFERENCE STYLE)
           * ========================================================================= */
          <div className="space-y-4">
            {studentsToRender.map((st) => (
              <div
                key={st.student.id}
                className="bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden print:break-inside-avoid print:shadow-none print:border-slate-400"
              >
                {/* Student Block Header */}
                <div className="bg-slate-50/90 px-3.5 py-2 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs">
                  {/* Left: Serial, Roll, Student details */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="print:hidden">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.has(st.student.id)}
                        onChange={() => toggleSelectStudent(st.student.id)}
                        className="w-3.5 h-3.5 rounded text-[#0f766e] focus:ring-teal-500 border-slate-300"
                      />
                    </span>

                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-[#0f766e] font-bold text-[11px]">
                      {st.serialNo}
                    </span>

                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-200/80 text-slate-800 text-[11px] border border-slate-300">
                      Roll No: {st.rollNo}
                    </span>

                    <div className="font-medium text-slate-800 tracking-tight">
                      <span>Student Name : </span>
                      <strong className="text-slate-900 font-bold uppercase">{st.name}</strong>
                      <span className="text-slate-400 mx-1">,</span>
                      <span>Fathers Name : </span>
                      <strong className="text-slate-800 uppercase">{st.fatherName}</strong>
                      <span className="text-slate-400 mx-1">,</span>
                      <span>Registration No: </span>
                      <strong className="font-mono text-slate-800">{st.registrationNo}</strong>
                    </div>
                  </div>

                  {/* Right: Status badges / Discrepancy Edit link */}
                  <div className="flex items-center gap-2 print:hidden">
                    {st.isAbsentAll && (
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-wider border border-rose-300">
                        ABSENT
                      </span>
                    )}

                    {st.hasErrors && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span title={st.errorMessages.join('; ')}>Discrepancy</span>
                        <button
                          type="button"
                          onClick={() =>
                            navigateTo(`/marks-entry/${exam.classId}/${exam.id}/${st.student.id}`)
                          }
                          className="text-teal-700 underline font-bold ml-1 hover:text-teal-900"
                        >
                          Edit
                        </button>
                      </div>
                    )}

                    {!st.isCompleted && !st.isAbsentAll && !st.hasErrors && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                        <span>Pending</span>
                        <button
                          type="button"
                          onClick={() =>
                            navigateTo(`/marks-entry/${exam.classId}/${exam.id}/${st.student.id}`)
                          }
                          className="text-teal-700 underline font-bold ml-1 hover:text-teal-900"
                        >
                          Enter
                        </button>
                      </div>
                    )}

                    {st.isCompleted && !st.hasErrors && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Completed</span>
                      </span>
                    )}
                  </div>

                  {/* Print status tag */}
                  <div className="hidden print:block font-bold text-[10px]">
                    {st.isAbsentAll ? (
                      <span className="text-rose-700 uppercase">[ABSENT]</span>
                    ) : st.isCompleted ? (
                      <span className="text-emerald-700">[OK]</span>
                    ) : (
                      <span className="text-amber-700">[PENDING]</span>
                    )}
                  </div>
                </div>

                {/* Marks Grid Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead className="bg-slate-100/80 text-slate-800 font-semibold border-b border-slate-300 text-[11px]">
                      <tr>
                        <th className="py-1.5 px-3 text-left w-28 bg-slate-200/50 border-r border-slate-300">
                          Components
                        </th>
                        {checklistData.subjects.map((sub) => (
                          <th
                            key={sub.id}
                            className="py-1.5 px-2 border-r border-slate-300 font-bold min-w-[75px]"
                          >
                            <div>{sub.name}</div>
                            <div className="text-[10px] font-mono text-slate-500 font-normal">
                              ({sub.fullMarks})
                            </div>
                          </th>
                        ))}
                        {showTotals && (
                          <th className="py-1.5 px-3 bg-teal-50/50 text-teal-900 font-bold min-w-[90px]">
                            Total
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {/* Active component rows (Objective, Descriptive, Practical, IA) */}
                      {checklistData.activeComponents.map((compDef) => {
                        let compRowObtained = 0;
                        let compRowFull = 0;
                        let hasAnyInRow = false;

                        return (
                          <tr key={compDef.key} className="hover:bg-slate-50/50">
                            {/* Component Name */}
                            <td className="py-1.5 px-3 text-left font-semibold text-slate-700 bg-slate-50/50 border-r border-slate-300 text-[11px]">
                              {compDef.label}
                            </td>

                            {/* Subjects Cells */}
                            {checklistData.subjects.map((sub) => {
                              const cellData = st.subjectCells[sub.id];
                              const compData = cellData?.components[compDef.key];

                              if (!compData || !compData.hasComponent) {
                                return (
                                  <td
                                    key={sub.id}
                                    className="py-1.5 px-2 text-slate-400 font-mono text-[10px] border-r border-slate-200"
                                  >
                                    NA
                                  </td>
                                );
                              }

                              if (compData.fullMarks > 0 && sub.includeInTotal !== false) {
                                compRowFull += compData.fullMarks;
                                if (compData.obtained !== null && !compData.isAbsent) {
                                  compRowObtained += compData.obtained;
                                  hasAnyInRow = true;
                                }
                              }

                              if (compData.isAbsent) {
                                return (
                                  <td
                                    key={sub.id}
                                    className="py-1.5 px-2 font-bold text-rose-600 border-r border-slate-200"
                                  >
                                    A
                                  </td>
                                );
                              }

                              if (compData.isGrade) {
                                return (
                                  <td
                                    key={sub.id}
                                    className="py-1.5 px-2 font-bold text-slate-800 border-r border-slate-200"
                                  >
                                    {compData.grade || 'Pass'}
                                  </td>
                                );
                              }

                              if (compData.isPending) {
                                return (
                                  <td
                                    key={sub.id}
                                    className="py-1.5 px-2 font-bold text-amber-600 font-mono border-r border-slate-200"
                                  >
                                    -
                                  </td>
                                );
                              }

                              return (
                                <td
                                  key={sub.id}
                                  className={`py-1.5 px-2 font-mono border-r border-slate-200 ${
                                    compData.isError
                                      ? 'bg-rose-100 text-rose-800 font-bold'
                                      : 'text-slate-800'
                                  }`}
                                  title={compData.errorReason}
                                >
                                  {compData.obtained} / {compData.fullMarks}
                                </td>
                              );
                            })}

                            {/* Total for this component row */}
                            {showTotals && (
                              <td className="py-1.5 px-3 font-mono font-semibold bg-slate-50 text-slate-800">
                                {st.isAbsentAll ? (
                                  <span className="text-rose-600 font-bold">A</span>
                                ) : hasAnyInRow ? (
                                  `${compRowObtained} / ${compRowFull}`
                                ) : (
                                  '-'
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}

                      {/* Total row for student */}
                      {showTotals && (
                        <tr className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300 text-[11px]">
                          <td className="py-2 px-3 text-left border-r border-slate-300">
                            Total Marks
                          </td>

                          {checklistData.subjects.map((sub) => {
                            const cell = st.subjectCells[sub.id];
                            if (!cell) {
                              return (
                                <td key={sub.id} className="py-2 px-2 text-slate-400 border-r border-slate-200">
                                  NA
                                </td>
                              );
                            }

                            if (cell.isAbsent) {
                              return (
                                <td key={sub.id} className="py-2 px-2 font-bold text-rose-600 border-r border-slate-200">
                                  A
                                </td>
                              );
                            }

                            if (cell.isGrade) {
                              return (
                                <td key={sub.id} className="py-2 px-2 font-bold text-slate-800 border-r border-slate-200">
                                  {cell.grade || 'Pass'}
                                </td>
                              );
                            }

                            if (cell.isPending || cell.totalObtained === null) {
                              return (
                                <td key={sub.id} className="py-2 px-2 font-bold text-amber-600 border-r border-slate-200">
                                  -
                                </td>
                              );
                            }

                            return (
                              <td key={sub.id} className="py-2 px-2 font-mono border-r border-slate-200">
                                {cell.totalObtained} / {cell.totalFullMarks}
                              </td>
                            );
                          })}

                          {/* Composite Total and % */}
                          <td className="py-2 px-3 font-mono text-[#0f766e] bg-teal-50 font-black">
                            {st.isAbsentAll ? (
                              <span className="text-rose-600">A</span>
                            ) : (
                              `${st.totalObtained} / ${st.totalFullMarks} (${st.percentage}%)`
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* =========================================================================
           * LAYOUT B: COMPACT TABLE (ONE ROW PER STUDENT)
           * ========================================================================= */
          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-[11px] border-b-2 border-slate-300">
                <tr>
                  <th className="py-2 px-2.5 text-center w-10">Sl</th>
                  <th className="py-2 px-3 text-center">Roll No.</th>
                  <th className="py-2 px-3">Student Name</th>
                  <th className="py-2 px-3">Father's Name</th>
                  <th className="py-2 px-3">Reg. No.</th>
                  {checklistData.subjects.map((s) => (
                    <th key={s.id} className="py-2 px-2 text-center border-l border-slate-300">
                      <div>{s.name}</div>
                      <div className="text-[10px] font-mono font-normal text-slate-500">
                        ({s.fullMarks})
                      </div>
                    </th>
                  ))}
                  {showTotals && (
                    <>
                      <th className="py-2 px-3 text-center border-l border-slate-300 bg-teal-50">
                        Total
                      </th>
                      <th className="py-2 px-2.5 text-center bg-teal-50">%</th>
                    </>
                  )}
                  <th className="py-2 px-3 text-center print:hidden">Status</th>
                  <th className="py-2 px-2.5 text-center print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {studentsToRender.map((st) => (
                  <tr key={st.student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-2.5 text-center font-bold text-slate-700">
                      {st.serialNo}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">
                      {st.rollNo}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 uppercase">
                      {st.name}
                    </td>
                    <td className="py-2 px-3 text-slate-700 uppercase">
                      {st.fatherName}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600">
                      {st.registrationNo}
                    </td>

                    {/* Subject columns */}
                    {checklistData.subjects.map((sub) => {
                      const cell = st.subjectCells[sub.id];
                      return (
                        <td
                          key={sub.id}
                          className="py-2 px-2 text-center font-mono border-l border-slate-200"
                        >
                          {!cell ? (
                            <span className="text-slate-400">NA</span>
                          ) : cell.isAbsent ? (
                            <span className="text-rose-600 font-bold">A</span>
                          ) : cell.isGrade ? (
                            <span className="font-bold text-slate-800">{cell.grade || 'Pass'}</span>
                          ) : cell.totalObtained !== null ? (
                            <span className="font-semibold">{cell.totalObtained}</span>
                          ) : (
                            <span className="text-amber-600 font-bold">-</span>
                          )}
                        </td>
                      );
                    })}

                    {showTotals && (
                      <>
                        <td className="py-2 px-3 text-center font-mono font-bold text-teal-800 bg-teal-50/50 border-l border-slate-200">
                          {st.isAbsentAll ? '0' : st.totalObtained} / {st.totalFullMarks}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-teal-800 bg-teal-50/50">
                          {st.isAbsentAll ? '0%' : `${st.percentage}%`}
                        </td>
                      </>
                    )}

                    <td className="py-2 px-3 text-center print:hidden">
                      {st.isAbsentAll ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold">
                          ABSENT
                        </span>
                      ) : st.isCompleted ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          COMPLETED
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold">
                          PENDING
                        </span>
                      )}
                    </td>

                    <td className="py-2 px-2.5 text-center print:hidden">
                      <button
                        type="button"
                        onClick={() =>
                          navigateTo(`/marks-entry/${exam.classId}/${exam.id}/${st.student.id}`)
                        }
                        className="text-teal-700 hover:text-teal-900 p-1 rounded hover:bg-teal-50"
                        title="Edit Marks for Student"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. OFFICIAL SIGNATURES & VERIFICATION DECLARATION BLOCK */}
        <div className="mt-8 pt-6 border-t-2 border-slate-800 print:break-inside-avoid space-y-5">
          {/* Declaration Line */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 leading-relaxed font-medium">
            <strong>DECLARATION & CERTIFICATE OF SCRUTINY:</strong> Certified that all marks recorded in this verification checklist have been meticulously tallied and verified against the original answer scripts, tabulation sheets, continuous internal evaluation registers, and student roll lists of the school. No unauthorized overwriting, omissions or calculation errors exist.
          </div>

          {/* Three Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-8 text-center text-xs text-slate-800">
            {/* Signature 1 */}
            <div className="space-y-1">
              <div className="border-b border-slate-700 mx-auto w-44 h-8" />
              <p className="font-bold">Prepared by (Class Teacher)</p>
              <p className="text-[10px] text-slate-500">Date: ________________</p>
            </div>

            {/* Signature 2 */}
            <div className="space-y-1">
              <div className="border-b border-slate-700 mx-auto w-44 h-8" />
              <p className="font-bold">Verified by (Scrutiny Committee Incharge)</p>
              <p className="text-[10px] text-slate-500">Date: ________________</p>
            </div>

            {/* Signature 3 */}
            <div className="space-y-1">
              <div className="border-b border-slate-700 mx-auto w-44 h-8" />
              <p className="font-bold text-slate-900">
                Verified by (Head Master / Principal)
              </p>
              <p className="text-[10px] text-slate-500">Official Seal & Signature</p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. SAVE SNAPSHOT MODAL */}
      {isSnapshotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-purple-50 text-purple-700">
                <BookmarkPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Save Checklist Snapshot</h3>
                <p className="text-xs text-slate-500">
                  Preserve an immutable permanent archive of all current student marks and statuses.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Archival Note / Reason (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Pre-submission scrutiny with subject teachers, all entries verified."
                value={snapshotNote}
                onChange={(e) => setSnapshotNote(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSnapshotModalOpen(false)}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingSnapshot}
                onClick={handleConfirmSaveSnapshot}
                className="px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 transition-colors shadow-2xs disabled:opacity-60"
              >
                {isSavingSnapshot ? 'Saving...' : 'Save to Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
