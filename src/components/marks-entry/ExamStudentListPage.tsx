import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { Student } from '../../types';
import { getExamStatus } from '../../utils/dateUtils';
import { ProgressStrip } from '../common/ProgressStrip';
import { StatusPill } from '../common/StatusPill';
import { DataTable, ColumnDef } from '../common/DataTable';
import { StudentModal } from './StudentModal';
import { EditStudentModal } from './EditStudentModal';
import { BulkImportModal } from '../bulk-import/BulkImportModal';

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
    importantNotifications,
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
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [openKebabStudentId, setOpenKebabStudentId] = useState<string | null>(null);
  const [highlightedStudentIds, setHighlightedStudentIds] = useState<string[]>([]);

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

  // Enrolled students for this exam
  const enrolledStudents = getStudentsForExam(examId);

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

  // Define Table Columns
  const columns: ColumnDef<Student>[] = [
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
          <span className="text-[10px] text-slate-400 block font-normal font-mono">
            Roll: {s.rollNo || 'N/A'} &bull; Sec: {s.section || 'A'}
          </span>
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
            {isFinalSubmitted ? (
              <button
                type="button"
                onClick={() => handleActionClick(s.id)}
                className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-300 transition-colors shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5 text-slate-600" />
                <span>View Marks</span>
              </button>
            ) : isCompleted ? (
              <button
                type="button"
                disabled={isOutsideDates}
                onClick={() => handleActionClick(s.id)}
                className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-400 text-xs font-bold rounded transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Edit student marks"
              >
                <Edit className="w-3.5 h-3.5 text-emerald-700" />
                <span>EDIT</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isOutsideDates}
                onClick={() => handleActionClick(s.id)}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-teal-600 text-xs font-semibold rounded transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Enter student marks"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" />
                <span>ENTER MARKS</span>
              </button>
            )}

            {!isFinalSubmitted && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenKebabStudentId(
                      openKebabStudentId === s.id ? null : s.id
                    );
                  }}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  aria-label="Student options menu"
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
                        className="w-full px-3 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5 text-teal-700" />
                        <span>Edit Student Details</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStudent(s)}
                        className="w-full px-3 py-2 flex items-center gap-2 text-red-700 hover:bg-red-50 transition-colors"
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
      {/* 1. IMPORTANT NOTIFICATION Card */}
      <section
        aria-labelledby="notification-heading"
        className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 md:p-6"
      >
        <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#b91c1c] shrink-0" />
            <h2
              id="notification-heading"
              className="text-[#b91c1c] font-bold text-base md:text-lg tracking-tight uppercase"
            >
              IMPORTANT NOTIFICATION:
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
            Guidelines &amp; Rules
          </span>
        </div>

        <ul className="space-y-2.5 text-xs md:text-sm text-slate-700 list-none leading-relaxed">
          {importantNotifications.map((note, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 p-2 rounded bg-slate-50/70 border border-slate-100"
            >
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-red-100 text-[#b91c1c] text-[10px] font-bold shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Safety Banners */}
      {isFinalSubmitted && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-red-900 text-xs md:text-sm flex items-center gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-[#b91c1c] shrink-0" />
          <div>
            <strong className="font-bold text-[#b91c1c]">Examination Locked: </strong>
            This exam has been <strong>Successfully Submitted</strong> to ASSEB-DI. Marks can no longer be edited or added.
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

        {/* Small grey sub heading on left, TWO BUTTONS (Click to Add Student + Bulk Import) on right */}
        <div className="border-b border-slate-200 pb-3.5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs md:text-sm text-slate-500 font-medium">
            List of Class {currentClass.name} Students {currentExam.academicYear}
          </p>

          {!isFinalSubmitted && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
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
            </div>
          )}
        </div>

        {/* Progress Strip */}
        <ProgressStrip
          completedCount={completedCount}
          totalCount={enrolledStudents.length}
          onBack={() => navigateTo(`/marks-entry/${classId}`)}
          backText={`Back to Class ${currentClass.name} Exams`}
        />

        {/* Data Table */}
        <DataTable
          data={enrolledStudents}
          columns={columns}
          rowClassName={(s) =>
            highlightedStudentIds.includes(s.id)
              ? 'bg-teal-50/90 ring-2 ring-teal-500 ring-inset animate-pulse'
              : ''
          }
          searchFields={[
            (s) => s.name,
            (s) => s.fatherName,
            (s) => s.registrationNo,
            (s) => s.rollNo || '',
          ]}
          searchPlaceholder="Search name, father name, registration no..."
          emptyMessage={`No enrolled students found for ${currentExam.name}. Click "Click to Add Student" or "Bulk Import" above to enroll candidates.`}
        />
      </section>

      {/* Add Student Modal (Single / Import from class) */}
      <StudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        targetClassId={classId}
        targetAcademicYear={currentExam.academicYear}
        targetExamId={examId}
      />

      {/* Dedicated Bulk Import Modal (3-step workflow, drag-and-drop, Excel parser, duplicate handling) */}
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
    </div>
  );
};
