import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  UserPlus,
  Upload,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  FileSpreadsheet,
  Users,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { Student } from '../../types';
import { getExamStatus } from '../../utils/dateUtils';
import { parseNumericRollNo, sortByRollNo } from '../../utils/rollNoUtils';
import { ProgressStrip } from '../common/ProgressStrip';
import { StatusPill } from '../common/StatusPill';
import { DataTable, ColumnDef } from '../common/DataTable';
import { StudentModal } from './StudentModal';
import { EditStudentModal } from './EditStudentModal';
import { BulkImportModal } from '../bulk-import/BulkImportModal';
import { ClassRosterDrawer } from './ClassRosterDrawer';

interface ExamStudentListPageProps {
  classId: string;
  examId: string;
}

export const ExamStudentListPage: React.FC<ExamStudentListPageProps> = ({
  classId,
  examId,
}) => {
  const {
    classes,
    exams,
    navigateTo,
    getStudentsForExam,
    removeStudentFromExam,
    getMarksStatus,
    toggleMarksStatus,
    undoBulkImport,
    addToast,
  } = usePortal();

  // Modals & Highlight state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [openKebabStudentId, setOpenKebabStudentId] = useState<string | null>(null);
  const [highlightedStudentIds, setHighlightedStudentIds] = useState<string[]>([]);

  // Check for last edited student from marks entry form to restore scroll and highlight for 2s
  useEffect(() => {
    try {
      const lastId = sessionStorage.getItem('last_edited_student_id');
      if (lastId) {
        setHighlightedStudentIds([lastId]);
        setTimeout(() => {
          const el = document.getElementById(`row-${lastId}`);
          if (el) {
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }, 100);

        const timer = setTimeout(() => {
          setHighlightedStudentIds([]);
          sessionStorage.removeItem('last_edited_student_id');
        }, 2000);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  // Target class & exam records
  const currentClass = classes.find((c) => c.id === classId) || {
    id: classId,
    name: classId,
    order: 0,
    hasStreams: false,
  };

  const currentExam = exams.find((e) => e.id === examId) || {
    id: examId,
    name: `CLASS ${currentClass.name.toUpperCase()} EXAMINATION 2026-2027`,
    classId: currentClass.id,
    className: currentClass.name,
    examTypeId: 'eval-1',
    examTypeName: 'Evaluation',
    academicYear: '2026-2027',
    startDate: '01-09-2026',
    endDate: '30-12-2026',
    isFinalSubmitted: false,
  };

  // Status computation
  const examStatus = getExamStatus(
    currentExam.startDate,
    currentExam.endDate,
    currentExam.isFinalSubmitted
  );
  const isFinalSubmitted = examStatus === 'FinalSubmitted';
  const isOutsideDates = examStatus === 'Closed' || examStatus === 'NotStarted';

  // Enrolled students for this exam sorted by numeric Roll No. ascending
  const enrolledStudents = useMemo(() => {
    return sortByRollNo(getStudentsForExam(examId));
  }, [examId, getStudentsForExam]);

  // Completed count calculation
  const completedCount = useMemo(() => {
    return enrolledStudents.filter(
      (s) => getMarksStatus(examId, s.id) === 'completed'
    ).length;
  }, [enrolledStudents, examId, getMarksStatus]);

  const handleActionClick = (studentId: string) => {
    navigateTo(`/marks-entry/${classId}/${examId}/${studentId}`);
  };

  const handleRemoveStudent = (student: Student) => {
    if (
      window.confirm(
        `Are you sure you want to remove ${student.name} from this exam? (The student master record will be preserved).`
      )
    ) {
      removeStudentFromExam(examId, student.id);
      setOpenKebabStudentId(null);
    }
  };

  // Handle Bulk Import completion with row highlight and 30s Undo toast
  const handleBulkImportComplete = (importedIds: string[]) => {
    setHighlightedStudentIds(importedIds);

    // Clear row highlight after 5 seconds
    setTimeout(() => {
      setHighlightedStudentIds([]);
    }, 5000);

    // 30-second undo toast
    addToast(
      `Successfully imported ${importedIds.length} student(s)!`,
      'success',
      'Undo last import',
      () => undoBulkImport(importedIds, examId),
      30000
    );
  };

  // Define Table Columns - Roll No is the FIRST column with numeric sorting
  const columns: ColumnDef<Student>[] = [
    {
      key: 'rollNo',
      header: 'Roll No.',
      sortable: true,
      align: 'center',
      width: '100px',
      accessor: (s) => parseNumericRollNo(s.rollNo) ?? 999999,
      render: (s) => {
        const num = parseNumericRollNo(s.rollNo);
        if (num !== null) {
          return (
            <span className="font-mono text-slate-900 font-bold text-sm bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {s.rollNo}
            </span>
          );
        }
        return (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
            title="Missing or non-numeric Roll No."
          >
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>No Roll</span>
          </span>
        );
      },
    },
    {
      key: 'registrationNo',
      header: 'Registration No.',
      sortable: true,
      align: 'center',
      width: '180px',
      render: (s) => (
        <span className="font-mono text-slate-700 font-semibold select-all">
          {s.registrationNo}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Student Name',
      sortable: true,
      align: 'left',
      width: '220px',
      render: (s) => (
        <div className="font-bold text-slate-900 tracking-tight">
          <span className="flex items-center gap-1.5">
            <span>{s.name}</span>
            {highlightedStudentIds.includes(s.id) && (
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-teal-200 text-teal-900 font-bold uppercase animate-bounce">
                New
              </span>
            )}
          </span>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-normal">
            <span className="font-mono bg-slate-100 px-1 rounded text-slate-700">Sec: {s.section || 'A'}</span>
            {s.currentAddress && (
              <span className="truncate max-w-[160px]" title={s.currentAddress}>
                &bull; {s.currentAddress}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'fatherName',
      header: "Father's Name",
      sortable: true,
      align: 'left',
      width: '200px',
      render: (s) => (
        <span className="text-slate-700 font-medium">{s.fatherName}</span>
      ),
    },
    {
      key: 'dob',
      header: 'DOB',
      sortable: true,
      align: 'center',
      width: '110px',
      render: (s) => (
        <span className="font-mono text-slate-600">{s.dob}</span>
      ),
    },
    {
      key: 'marksStatus',
      header: 'Marks Entry Status',
      sortable: true,
      align: 'center',
      width: '160px',
      accessor: (s) => getMarksStatus(examId, s.id),
      render: (s) => {
        const status = getMarksStatus(examId, s.id);
        return (
          <div className="inline-flex items-center gap-1.5">
            <StatusPill status={status} />
            {!isFinalSubmitted && (
              <button
                type="button"
                onClick={() => toggleMarksStatus(examId, s.id)}
                title="Click to toggle status for demo"
                className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-400 hover:text-teal-700 p-0.5 rounded transition-opacity"
              >
                &bull;
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: 'action',
      header: 'Action',
      sortable: false,
      align: 'center',
      width: '180px',
      render: (s) => {
        const status = getMarksStatus(examId, s.id);
        const isCompleted = status === 'completed';

        return (
          <div className="flex items-center justify-center gap-2 relative">
            {/* Primary Action Button: Enter Marks or View Marks */}
            <button
              type="button"
              onClick={() => handleActionClick(s.id)}
              className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md shadow-2xs hover:shadow transition-colors cursor-pointer ${
                isCompleted
                  ? 'bg-teal-700 hover:bg-teal-800 text-white'
                  : 'bg-[#9333ea] hover:bg-[#7e22ce] text-white'
              }`}
              title={
                isCompleted
                  ? 'View / Edit Marks for this candidate'
                  : 'Enter marks for this candidate'
              }
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>View / Edit</span>
                </>
              ) : (
                <>
                  <Edit className="w-3.5 h-3.5" />
                  <span>Enter Marks</span>
                </>
              )}
            </button>

            {/* Context menu for student operations if exam not submitted */}
            {!isFinalSubmitted && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenKebabStudentId(
                      openKebabStudentId === s.id ? null : s.id
                    )
                  }
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="More actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {openKebabStudentId === s.id && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setOpenKebabStudentId(null)}
                    />
                    <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-40 py-1 text-left text-xs animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStudent(s);
                          setOpenKebabStudentId(null);
                        }}
                        className="w-full px-3 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-teal-700" />
                        <span>Edit Student Details</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStudent(s)}
                        className="w-full px-3 py-2 flex items-center gap-2 text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        <span>Remove from this exam</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">

      {/* Safety Banners */}
      {isFinalSubmitted && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-red-900 text-xs md:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-[#b91c1c] shrink-0" />
            <div>
              <strong className="font-bold text-[#b91c1c]">Examination Locked: </strong>
              This exam has been <strong>Successfully Submitted</strong>. To make corrections, cancel the Final Submit from the Final Submit page.
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigateTo('/final-submit')}
            className="px-3.5 py-1.5 bg-[#b91c1c] hover:bg-red-800 text-white font-bold text-xs rounded-md shrink-0 transition-colors cursor-pointer shadow-2xs"
          >
            Go to Final Submit
          </button>
        </div>
      )}

      {/* Prominent Yellow Alert for Reopened / Cancelled Final Submit */}
      {currentExam.cancelHistory && currentExam.cancelHistory.length > 0 && !isFinalSubmitted && (
        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-lg text-amber-950 text-xs md:text-sm flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div>
              <strong className="font-extrabold text-amber-900">Final Submit was cancelled on {currentExam.cancelHistory[0].cancelledAt} for correction: </strong>
              <span className="italic font-semibold">"{currentExam.cancelHistory[0].reason}"</span>
            </div>
            <p className="text-xs text-amber-800">
              Please Final Submit again after making corrections. Marksheets and tabulation results will automatically recalculate with any corrected marks.
            </p>
          </div>
        </div>
      )}

      {isOutsideDates && !isFinalSubmitted && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs md:text-sm flex items-center gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
          <div>
            <strong className="font-bold">Submission Window Notice: </strong>
            This exam is currently outside its scheduled submission window ({currentExam.startDate} to {currentExam.endDate}). Marks entry and candidate additions are disabled.
          </div>
        </div>
      )}

      {/* 2. Main Exam & Student List Card */}
      <section
        aria-labelledby="exam-heading"
        className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 md:p-6"
      >
        {/* Big Heading: EXAMINATION : <EXAM NAME> */}
        <div className="mb-4">
          <span className="text-[11px] font-bold text-teal-700 tracking-wider uppercase block mb-1">
            Exam Marks Management Portal
          </span>
          <h2
            id="exam-heading"
            className="text-lg md:text-2xl font-extrabold text-slate-900 tracking-tight uppercase"
          >
            EXAMINATION : {currentExam.name}
          </h2>
        </div>

        {/* Small grey sub heading on left, ACTION BUTTONS on right */}
        <div className="border-b border-slate-200 pb-3.5 mb-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <p className="text-xs md:text-sm text-slate-500 font-medium">
            List of Class {currentClass.name} Students {currentExam.academicYear}
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Class Roster & Renumber Tool Button */}
            <button
              type="button"
              onClick={() => setIsRosterOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold rounded-md shadow-2xs transition-colors cursor-pointer"
              title="View class student roster and renumber roll numbers"
            >
              <Users className="w-4 h-4 text-slate-600" />
              <span>Class Roster &amp; Renumber</span>
            </button>

            {!isFinalSubmitted && (
              <>
                {/* Button 1: Click to Add Student (Teal background) */}
                <button
                  type="button"
                  disabled={isOutsideDates}
                  onClick={() => setIsAddStudentOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0f766e] hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Click to Add Student</span>
                </button>

                {/* Button 2: Bulk Import (White background, teal outline, teal text, upload icon) */}
                <button
                  type="button"
                  disabled={isOutsideDates}
                  onClick={() => setIsBulkImportOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-teal-50/70 border border-[#0f766e] text-[#0f766e] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold rounded-md shadow-2xs transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-[#0f766e]" />
                  <span>Bulk Import</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress Strip */}
        <ProgressStrip
          completedCount={completedCount}
          totalCount={enrolledStudents.length}
          onBack={() => navigateTo(`/marks-entry/${classId}`)}
          backText={`Back to Class ${currentClass.name} Exams`}
        />

        {/* Data Table with Roll No as first column */}
        <DataTable
          data={enrolledStudents}
          columns={columns}
          rowClassName={(s) =>
            highlightedStudentIds.includes(s.id)
              ? 'bg-teal-50/90 ring-2 ring-teal-500 ring-inset animate-pulse'
              : ''
          }
          searchFields={[
            (s) => s.rollNo || '',
            (s) => s.name,
            (s) => s.fatherName,
            (s) => s.registrationNo || '',
          ]}
          searchPlaceholder="Search roll no, student name, father name, registration no..."
          emptyMessage={`No enrolled students found for ${currentExam.name}. Click "Click to Add Student" or "Bulk Import" above to enroll candidates.`}
        />
      </section>

      {/* Add Student Modal */}
      <StudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        targetClassId={classId}
        targetAcademicYear={currentExam.academicYear}
        targetExamId={examId}
      />

      {/* Dedicated Bulk Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        targetClassId={classId}
        targetClassName={currentClass.name}
        targetAcademicYear={currentExam.academicYear}
        targetExamId={examId}
        onImportComplete={handleBulkImportComplete}
      />

      {/* Edit Student Modal */}
      <EditStudentModal
        isOpen={Boolean(editingStudent)}
        student={editingStudent}
        onClose={() => setEditingStudent(null)}
      />

      {/* Class Roster & Renumber Drawer */}
      <ClassRosterDrawer
        isOpen={isRosterOpen}
        onClose={() => setIsRosterOpen(false)}
        classId={currentClass.id}
        className={currentClass.name}
        academicYear={currentExam.academicYear}
        onOpenAddStudent={() => {
          setIsRosterOpen(false);
          setIsAddStudentOpen(true);
        }}
        onOpenEditStudent={(s) => {
          setIsRosterOpen(false);
          setEditingStudent(s);
        }}
      />
    </div>
  );
};
