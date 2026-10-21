import React from 'react';
import {
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpenCheck,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { StatusPill } from '../common/StatusPill';

interface StudentMarksEntryPlaceholderProps {
  classId: string;
  examId: string;
  studentId?: string;
}

export const StudentMarksEntryPlaceholder: React.FC<StudentMarksEntryPlaceholderProps> = ({
  classId,
  examId,
  studentId,
}) => {
  const {
    classes,
    exams,
    students,
    navigateTo,
    getMarksStatus,
    toggleMarksStatus,
    schoolInfo,
  } = usePortal();

  const currentClass = classes.find((c) => c.id === classId) || {
    id: classId,
    name: classId,
    order: 0,
    hasStreams: false,
  };

  const currentExam = exams.find((e) => e.id === examId) || {
    id: examId,
    name: `CLASS ${currentClass.name.toUpperCase()} EXAMINATION`,
    className: currentClass.name,
    academicYear: '2026-2027',
    startDate: '01-09-2026',
    endDate: '30-12-2026',
    isFinalSubmitted: false,
  };

  const student = studentId ? students.find((s) => s.id === studentId) : null;
  const status = studentId ? getMarksStatus(examId, studentId) : 'not_completed';

  return (
    <div className="space-y-5">
      {/* Navigation Breadcrumb / Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigateTo(`/marks-entry/${classId}/${examId}`)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-teal-900 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-teal-700" />
          <span>Back to Candidate Roster</span>
        </button>

        <span className="text-xs text-slate-500 font-mono">
          School Code: <strong className="text-slate-800">{schoolInfo.code}</strong>
        </span>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-6 md:p-8">
        {/* Header with teal title */}
        <div className="border-b border-slate-200 pb-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block mb-1">
                Step 4 Preview &bull; Candidate Marks Entry Sheet
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                {currentExam.name}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
                Class: {currentClass.name}
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono">
                AY: {currentExam.academicYear}
              </span>
            </div>
          </div>
        </div>

        {/* Student Details Pill Strip if student selected */}
        {student && (
          <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Student Name:</span>
              <span className="font-bold text-slate-900 text-sm">
                {student.name}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Registration No:</span>
              <span className="font-mono font-semibold text-slate-800">
                {student.registrationNo}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Father / Roll:</span>
              <span className="font-medium text-slate-800">
                {student.fatherName} (Roll: {student.rollNo || '01'})
              </span>
            </div>
            <div className="flex sm:flex-col sm:items-end justify-between items-center">
              <span className="text-slate-400 block text-[11px]">Marks Status:</span>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusPill status={status} />
                <button
                  type="button"
                  onClick={() => toggleMarksStatus(examId, student.id)}
                  className="px-2 py-0.5 text-[10px] rounded border border-slate-300 hover:bg-slate-200 text-slate-700 font-semibold"
                  title="Toggle status"
                >
                  Toggle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Coming-in-Step-4 Showcase */}
        <div className="max-w-2xl mx-auto py-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto shadow-inner">
            <FileSpreadsheet className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-slate-800">
            Subject-wise Marks Entry Comes in Step 4
          </h3>

          <p className="text-sm text-slate-600 leading-relaxed">
            In Step 4, the full subject-wise marks evaluation grid (Theory, Practical, Oral, and Project marks) with real-time total aggregation, grade point calculation, and instant keyboard navigation will be activated here for{' '}
            <strong>{student ? student.name : `Class ${currentClass.name} candidates`}</strong>.
          </p>

          <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-lg text-xs text-teal-900 text-left max-w-lg mx-auto space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-teal-800">
              <BookOpenCheck className="w-4 h-4" />
              <span>Step 4 Subject Curriculum Preview:</span>
            </div>
            <ul className="list-disc list-inside text-slate-700 text-[11px] space-y-0.5">
              <li>MIL (Assamese / Bodo / Bengali / Hindi)</li>
              <li>General English (Theory 90 + IA 10)</li>
              <li>General Mathematics (Theory 90 + IA 10)</li>
              <li>General Science (Theory 90 + Practical/IA 10)</li>
              <li>Social Science (Theory 90 + IA 10)</li>
              <li>Elective Subjects (Computer Science / Advanced Maths / Sanskrit / etc.)</li>
            </ul>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigateTo(`/marks-entry/${classId}/${examId}`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0f766e] hover:bg-teal-800 text-white font-medium text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Exam Student List</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              <span>Go to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
