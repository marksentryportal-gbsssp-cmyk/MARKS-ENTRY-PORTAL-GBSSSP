import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  UserX,
  UserCheck,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { Student, ExamRecord } from '../../types';
import { usePortal } from '../../store/portalStore';

interface StudentInfoBarProps {
  exam: ExamRecord;
  student: Student;
  currentIndex: number; // 0-based
  totalCount: number;
  isAllAbsent: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToggleAbsent: () => void;
  onOpenEditStudent: () => void;
  onStudentDeleted: () => void;
  isReadOnly?: boolean;
}

export const StudentInfoBar: React.FC<StudentInfoBarProps> = ({
  exam,
  student,
  currentIndex,
  totalCount,
  isAllAbsent,
  onPrevious,
  onNext,
  onToggleAbsent,
  onOpenEditStudent,
  onStudentDeleted,
  isReadOnly = false,
}) => {
  const { deleteStudentWithAction, getStudentExamCountWithMarks, addToast } = usePortal();

  const [isAbsentModalOpen, setIsAbsentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const existingMarksCount = getStudentExamCountWithMarks(student.id);

  const handleConfirmAbsentAction = () => {
    onToggleAbsent();
    setIsAbsentModalOpen(false);
  };

  const handleConfirmSoftDelete = () => {
    deleteStudentWithAction(student.id, 'soft');
    setIsDeleteModalOpen(false);
    onStudentDeleted();
  };

  const handleConfirmHardDelete = () => {
    deleteStudentWithAction(student.id, 'hard');
    setIsDeleteModalOpen(false);
    onStudentDeleted();
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-slate-200/90 shadow-xs p-4 md:p-5 space-y-4">
        {/* Row 1: Large Teal Examination Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-lg md:text-xl font-black text-[#0f766e] tracking-tight">
            Examination : {exam.name}
          </h2>

          {/* Student Position Counter & Arrow Navigation */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={onPrevious}
              className="p-1 rounded text-slate-600 hover:text-purple-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Previous Student"
              aria-label="Previous Student"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold font-mono text-slate-700 px-1 select-none">
              Student {currentIndex + 1} of {totalCount}
            </span>

            <button
              type="button"
              disabled={currentIndex >= totalCount - 1}
              onClick={onNext}
              className="p-1 rounded text-slate-600 hover:text-purple-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Next Student"
              aria-label="Next Student"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Student Metadata Grid (bold teal labels, normal teal values) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs md:text-sm bg-teal-50/40 p-3.5 rounded-lg border border-teal-100/80">
          <div>
            <span className="font-bold text-[#0f766e] block text-[11px] uppercase tracking-wider">
              Registration No :
            </span>
            <span className="text-[#0f766e] font-semibold font-mono tracking-tight select-all">
              {student.registrationNo}
            </span>
          </div>

          <div>
            <span className="font-bold text-[#0f766e] block text-[11px] uppercase tracking-wider">
              Student Name :
            </span>
            <span className="text-[#0f766e] font-bold">
              {student.name}
            </span>
          </div>

          <div>
            <span className="font-bold text-[#0f766e] block text-[11px] uppercase tracking-wider">
              Father Name :
            </span>
            <span className="text-[#0f766e] font-medium">
              {student.fatherName}
            </span>
          </div>

          <div>
            <span className="font-bold text-[#0f766e] block text-[11px] uppercase tracking-wider">
              Class :
            </span>
            <span className="text-[#0f766e] font-medium capitalize">
              {exam.className}
            </span>
          </div>

          <div>
            <span className="font-bold text-[#0f766e] block text-[11px] uppercase tracking-wider">
              Roll No. :
            </span>
            <span className="text-[#0f766e] font-bold font-mono">
              {student.rollNo || '01'} (Sec {student.section || 'A'})
            </span>
          </div>

          <div>
            <span className="font-bold text-[#0f766e] block text-[11px] uppercase tracking-wider">
              DOB :
            </span>
            <span className="text-[#0f766e] font-mono">
              {student.dob}
            </span>
          </div>
        </div>

        {/* Thin divider */}
        <hr className="border-t border-slate-200" />

        {/* Row 3: Action Buttons (Three Outlined Purple Buttons) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 1. MARK ABSENT / UNDO ABSENT */}
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => setIsAbsentModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all shadow-2xs border cursor-pointer ${
                isAllAbsent
                  ? 'bg-amber-50 text-amber-900 border-amber-400 hover:bg-amber-100 ring-2 ring-amber-300'
                  : 'bg-white text-[#7e22ce] border-[#9333ea] hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {isAllAbsent ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>UNDO ABSENT</span>
                </>
              ) : (
                <>
                  <UserX className="w-3.5 h-3.5 text-[#9333ea]" />
                  <span>MARK ABSENT</span>
                </>
              )}
            </button>

            {/* 2. UPDATE STUDENT */}
            <button
              type="button"
              disabled={isReadOnly}
              onClick={onOpenEditStudent}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-[#7e22ce] border border-[#9333ea] hover:bg-purple-50 rounded-md text-xs font-bold transition-all shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#9333ea]" />
              <span>UPDATE STUDENT</span>
            </button>

            {/* 3. DELETE STUDENT */}
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-[#7e22ce] border border-[#9333ea] hover:bg-red-50 hover:text-red-700 hover:border-red-400 rounded-md text-xs font-bold transition-all shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#9333ea]" />
              <span>DELETE STUDENT</span>
            </button>
          </div>

          {/* Absent status pill badge if candidate is all absent */}
          {isAllAbsent && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 text-xs font-black rounded-full border border-red-300 animate-pulse">
              <UserX className="w-3 h-3" />
              CANDIDATE ABSENT IN ALL SUBJECTS
            </span>
          )}
        </div>
      </div>

      {/* MARK ABSENT / UNDO ABSENT CONFIRMATION MODAL */}
      {isAbsentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 bg-purple-50 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-purple-700" />
                <h3 className="text-sm font-bold text-purple-950">
                  {isAllAbsent ? 'Undo Absent Status' : 'Confirm Mark Absent'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAbsentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">
                Student: <span className="text-[#0f766e]">{student.name}</span> (Roll: {student.rollNo})
              </p>
              {isAllAbsent ? (
                <p>
                  This candidate is currently marked as Absent in all subjects. Restoring will enable marks entry fields so you can enter scores.
                </p>
              ) : (
                <p className="leading-relaxed">
                  Are you sure you want to mark this student absent in <strong>ALL subjects</strong> for this examination?
                  All subject inputs will be set to <strong>"A"</strong> and marks status will be updated accordingly.
                </p>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-800 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  According to examination rules, absent subjects receive 0 marks in composite calculation while subject full marks are counted in the denominator.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAbsentModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAbsentAction}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#9333ea] hover:bg-[#7e22ce] rounded shadow-xs"
              >
                {isAllAbsent ? 'Restore Candidate' : 'Confirm Mark Absent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE STUDENT CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-red-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 bg-red-50 border-b border-red-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-bold text-red-950">
                  Delete Student from Class Roster
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-700">
              <div>
                <p className="font-bold text-slate-900 text-sm">{student.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">
                  Reg No: {student.registrationNo} &bull; Class: {exam.className} &bull; Roll: {student.rollNo}
                </p>
              </div>

              {existingMarksCount > 0 ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    Existing Marks Warning
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    This student has marks entered in <strong>{existingMarksCount} exam(s)</strong>.
                    Deleting permanently will remove those marks records and affect historical results.
                  </p>
                </div>
              ) : (
                <p className="text-slate-600">
                  No marks have been recorded for this student yet.
                </p>
              )}

              <p className="font-medium text-slate-800">
                Recommended action: <strong>Mark as Inactive</strong> hides the student from future exam entry lists while preserving all entered marks and progress reports.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded self-start sm:self-auto"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleConfirmHardDelete}
                  className="px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 rounded border border-red-300"
                  title="Remove record completely"
                >
                  Delete permanently
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSoftDelete}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded shadow-xs"
                >
                  Mark Inactive (keep data)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
