import React, { useMemo, useState } from 'react';
import {
  Printer,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Award,
  CheckCircle2,
  AlertCircle,
  School,
  Calendar,
  User,
  ShieldCheck,
  FileBadge
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { computeClassResults } from '../../utils/resultCalculator';
import { SchoolLogo } from '../common/SchoolLogo';

interface StudentMarksheetViewProps {
  classId: string;
  studentId: string;
}

export const StudentMarksheetView: React.FC<StudentMarksheetViewProps> = ({
  classId,
  studentId,
}) => {
  const {
    classes,
    students,
    subjects,
    exams,
    examTypes,
    marks,
    resultSettings,
    schoolInfo,
    navigateTo,
  } = usePortal();

  const currentAcademicYear = '2026-2027';
  const targetClass = classes.find((c) => c.id === classId);

  const [showWeightedBreakdown, setShowWeightedBreakdown] = useState(
    resultSettings.showWeightedBreakdown !== false
  );

  // Compute results for the entire class to calculate rank, topper, percentiles
  const classResults = useMemo(() => {
    return computeClassResults(
      classId,
      currentAcademicYear,
      students,
      subjects,
      exams,
      examTypes,
      marks,
      resultSettings
    );
  }, [classId, currentAcademicYear, students, subjects, exams, examTypes, marks, resultSettings]);

  // Find this student's result
  const currentResultIndex = classResults.findIndex(
    (r) => r.student.id === studentId
  );
  const studentResult = classResults[currentResultIndex];

  // Navigation to next/previous student
  const prevStudent =
    currentResultIndex > 0 ? classResults[currentResultIndex - 1] : null;
  const nextStudent =
    currentResultIndex < classResults.length - 1
      ? classResults[currentResultIndex + 1]
      : null;

  const handlePrint = () => {
    window.print();
  };

  // Exam groups from settings
  const evalGroup = resultSettings.examGroups?.find((g) =>
    g.examTypeIds.includes('eval-1') || g.id === 'grp-eval'
  ) || { id: 'grp-eval', name: 'Evaluation', percent: 20, examTypeIds: ['eval-1', 'eval-2'] };

  const halfGroup = resultSettings.examGroups?.find((g) =>
    g.examTypeIds.includes('half-yearly') || g.id === 'grp-half-yearly'
  ) || { id: 'grp-half-yearly', name: 'Half Yearly', percent: 30, examTypeIds: ['half-yearly'] };

  const annualGroup = resultSettings.examGroups?.find((g) =>
    g.examTypeIds.includes('annual') || g.id === 'grp-annual'
  ) || { id: 'grp-annual', name: 'Annual', percent: 50, examTypeIds: ['annual'] };

  if (!studentResult || !targetClass) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Student Record Not Found</h2>
        <p className="text-sm text-slate-500 mt-1">
          Could not locate the marksheet for this candidate.
        </p>
        <button
          type="button"
          onClick={() => navigateTo(`/result/${classId}`)}
          className="mt-4 px-4 py-2 bg-teal-700 text-white rounded-md text-sm font-semibold hover:bg-teal-800"
        >
          Return to Class Result
        </button>
      </div>
    );
  }

  const {
    student,
    rank,
    subjectResults,
    totalObtained,
    totalFullMarks,
    percentage,
    overallGrade,
    overallRemark,
    isPassed,
  } = studentResult;

  // Separate scholastic vs co-scholastic subjects
  const scholasticSubjects = subjectResults.filter((sr) => sr.subject.type === 'marks');
  const coScholasticSubjects = subjectResults.filter((sr) => sr.subject.type === 'grade');

  // Calculate totals for each column
  const colTotals = scholasticSubjects.reduce(
    (acc, sr) => {
      const e1 = sr.examMarks['eval-1'];
      const e2 = sr.examMarks['eval-2'];
      const hy = sr.examMarks['half-yearly'];
      const an = sr.examMarks['annual'];

      if (e1 && e1.obtained !== null && !e1.absent) acc.eval1 += e1.obtained;
      if (e2 && e2.obtained !== null && !e2.absent) acc.eval2 += e2.obtained;
      acc.evalWeighted += sr.groupScores[evalGroup.id]?.weightedScore || 0;

      if (hy && hy.obtained !== null && !hy.absent) acc.half += hy.obtained;
      acc.halfWeighted += sr.groupScores[halfGroup.id]?.weightedScore || 0;

      if (an && an.obtained !== null && !an.absent) acc.annual += an.obtained;
      acc.annualWeighted += sr.groupScores[annualGroup.id]?.weightedScore || 0;

      return acc;
    },
    {
      eval1: 0,
      eval2: 0,
      evalWeighted: 0,
      half: 0,
      halfWeighted: 0,
      annual: 0,
      annualWeighted: 0,
    }
  );

  return (
    <div className="space-y-6">
      {/* Action Bar (Hidden on print) */}
      <div className="no-print bg-white rounded-lg border border-slate-200/80 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigateTo(`/result/${classId}`)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Class {targetClass.name} Results
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Weighted Breakdown */}
          <button
            type="button"
            onClick={() => setShowWeightedBreakdown(!showWeightedBreakdown)}
            className={`px-3 py-1.5 rounded border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              showWeightedBreakdown
                ? 'bg-teal-50 border-teal-300 text-teal-800'
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>Weighted Columns:</span>
            <span className="font-bold uppercase font-mono">
              {showWeightedBreakdown ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Previous / Next student switcher */}
          <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
            <button
              type="button"
              disabled={!prevStudent}
              onClick={() =>
                prevStudent &&
                navigateTo(`/result/${classId}/student/${prevStudent.student.id}`)
              }
              className={`p-1.5 rounded flex items-center gap-1 ${
                prevStudent
                  ? 'text-slate-700 hover:bg-white hover:text-teal-700 cursor-pointer'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
              title={prevStudent ? `Previous: ${prevStudent.student.name}` : undefined}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden md:inline">Previous</span>
            </button>
            <span className="px-2 text-slate-400">
              {currentResultIndex + 1} of {classResults.length}
            </span>
            <button
              type="button"
              disabled={!nextStudent}
              onClick={() =>
                nextStudent &&
                navigateTo(`/result/${classId}/student/${nextStudent.student.id}`)
              }
              className={`p-1.5 rounded flex items-center gap-1 ${
                nextStudent
                  ? 'text-slate-700 hover:bg-white hover:text-teal-700 cursor-pointer'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
              title={nextStudent ? `Next: ${nextStudent.student.name}` : undefined}
            >
              <span className="hidden md:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Official Printable Progress Report / Marksheet Container */}
      <div className="print-area bg-white rounded-lg border-2 border-slate-300 shadow-sm p-6 sm:p-10 max-w-4xl mx-auto text-slate-900 font-sans print:border-none print:shadow-none print:p-0 print:max-w-none">
        {/* Certificate Style Double Border Accent */}
        <div className="border-4 border-double border-teal-900/80 p-5 sm:p-7 rounded-sm relative">
          
          {/* Watermark Logo in background for print authenticity */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <Award className="w-96 h-96 text-teal-900" />
          </div>

          {/* 1. Official Header */}
          <div className="text-center pb-5 border-b-2 border-slate-800 relative">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
                <SchoolLogo size="lg" editable={false} />
              </div>

              <div className="flex-1">
                <p className="text-xs sm:text-sm font-bold tracking-widest text-slate-700 uppercase">
                  {schoolInfo.boardName}
                </p>
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-snug mt-0.5">
                  {schoolInfo.name}
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                  P.O. PAGLAHAT, DIST: DHUBRI (ASSAM) - PIN: 783334
                </p>
                <div className="inline-flex items-center gap-2 mt-1 px-2.5 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-mono font-bold border border-slate-300">
                  <span>SCHOOL CODE: {schoolInfo.code}</span>
                  <span>•</span>
                  <span>SESSION: {resultSettings.session || currentAcademicYear}</span>
                </div>
              </div>

              <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex flex-col items-center justify-center border border-slate-300 rounded bg-slate-50 text-[10px] text-slate-500 font-mono">
                <ShieldCheck className="w-6 h-6 text-teal-700 mb-0.5" />
                <span>OFFICIAL</span>
              </div>
            </div>

            <div className="mt-3 inline-block bg-teal-800 text-white font-black tracking-wider uppercase text-xs sm:text-sm py-1.5 px-6 rounded-xs shadow-xs">
              {resultSettings.marksheetTitle || 'PROGRESS REPORT / MARKSHEET 2026-2027'}
            </div>
          </div>

          {/* 2. Student Bio-Data & Identity Box */}
          <div className="mt-4 border border-slate-700 text-xs">
            <div className="bg-slate-100 border-b border-slate-700 px-3 py-1 font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between">
              <span>Candidate Information</span>
              <span className="font-mono text-[11px] text-slate-600">Class: {targetClass.name}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-700">
              {/* Left Column */}
              <div className="divide-y divide-slate-300">
                <div className="p-2 flex items-center justify-between bg-slate-50/50">
                  <span className="font-semibold text-slate-600">Student Name:</span>
                  <span className="font-bold text-slate-900 uppercase">{student.name}</span>
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Father's Name:</span>
                  <span className="font-medium text-slate-800 uppercase">{student.fatherName}</span>
                </div>
                <div className="p-2 flex items-center justify-between bg-slate-50/50">
                  <span className="font-semibold text-slate-600">Mother's Name:</span>
                  <span className="font-medium text-slate-800 uppercase">{student.motherName || 'N/A'}</span>
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Date of Birth:</span>
                  <span className="font-mono text-slate-800">{student.dob}</span>
                </div>
              </div>

              {/* Right Column */}
              <div className="divide-y divide-slate-300">
                <div className="p-2 flex items-center justify-between bg-slate-50/50">
                  <span className="font-semibold text-slate-600">Registration No:</span>
                  <span className="font-mono font-bold text-slate-900">{student.registrationNo}</span>
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Class & Section:</span>
                  <span className="font-medium text-slate-800">Class {targetClass.name} (Sec {student.section})</span>
                </div>
                <div className="p-2 flex items-center justify-between bg-slate-50/50">
                  <span className="font-semibold text-slate-600">Roll Number:</span>
                  <span className="font-mono font-bold text-slate-900">{student.rollNo}</span>
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Academic Year:</span>
                  <span className="font-mono text-slate-800">{student.academicYear}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Academic Evaluation / Marks Table */}
          <div className="mt-5">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-900 mb-1 flex items-center justify-between">
              <span>Part I: Scholastic Performance</span>
              {showWeightedBreakdown && (
                <span className="text-[10px] text-teal-700 font-semibold normal-case">
                  Showing raw marks & weighted conversion columns
                </span>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-700">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-700 text-slate-900 font-bold">
                    <th className="py-2 px-2 border-r border-slate-300 text-center w-8">Sl.</th>
                    <th className="py-2 px-3 border-r border-slate-300">Subject Name</th>
                    <th className="py-2 px-2 border-r border-slate-300 text-center w-10">Full</th>
                    <th className="py-2 px-2 border-r border-slate-300 text-center w-10">Pass</th>

                    {/* 1st Evaluation */}
                    <th className="py-2 px-1.5 border-r border-slate-300 text-center">
                      1st Eval (50)
                    </th>

                    {/* 2nd Evaluation */}
                    <th className="py-2 px-1.5 border-r border-slate-300 text-center">
                      2nd Eval (50)
                    </th>

                    {/* Evaluation Combined Column */}
                    {showWeightedBreakdown && (
                      <th className="py-2 px-1.5 border-r border-slate-300 text-center bg-teal-50 text-teal-950 font-black">
                        {evalGroup.name} ({evalGroup.percent})
                      </th>
                    )}

                    {/* Half Yearly */}
                    <th className="py-2 px-1.5 border-r border-slate-300 text-center">
                      Half Yearly (100)
                    </th>

                    {/* Half Yearly Weighted */}
                    {showWeightedBreakdown && (
                      <th className="py-2 px-1.5 border-r border-slate-300 text-center bg-teal-50 text-teal-950 font-black">
                        {halfGroup.name} ({halfGroup.percent})
                      </th>
                    )}

                    {/* Annual Examination */}
                    <th className="py-2 px-1.5 border-r border-slate-300 text-center">
                      Annual (100)
                    </th>

                    {/* Annual Weighted */}
                    {showWeightedBreakdown && (
                      <th className="py-2 px-1.5 border-r border-slate-300 text-center bg-teal-50 text-teal-950 font-black">
                        {annualGroup.name} ({annualGroup.percent})
                      </th>
                    )}

                    {/* Final Composite Total */}
                    <th className="py-2 px-2 border-r border-slate-300 text-center bg-teal-100 text-teal-950 font-black">
                      Total (100)
                    </th>
                    <th className="py-2 px-2 border-r border-slate-300 text-center w-12">Grade</th>
                    <th className="py-2 px-2 text-center w-16">Remarks</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-300">
                  {scholasticSubjects.map((sr, idx) => {
                    const isSubjectPassed = sr.isPassed;
                    const eval1 = sr.examMarks['eval-1'];
                    const eval2 = sr.examMarks['eval-2'];
                    const half = sr.examMarks['half-yearly'];
                    const annual = sr.examMarks['annual'];

                    const evalWeighted = sr.groupScores[evalGroup.id]?.weightedScore;
                    const halfWeighted = sr.groupScores[halfGroup.id]?.weightedScore;
                    const annualWeighted = sr.groupScores[annualGroup.id]?.weightedScore;

                    return (
                      <tr
                        key={sr.subject.id}
                        className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}
                      >
                        <td className="py-2 px-2 border-r border-slate-300 text-center font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300 font-semibold text-slate-900">
                          {sr.subject.name}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-300 text-center font-mono">
                          {sr.fullMarks}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-300 text-center font-mono text-slate-600">
                          {sr.passMarks}
                        </td>

                        {/* 1st Eval */}
                        <td className="py-2 px-1.5 border-r border-slate-300 text-center font-mono">
                          {eval1?.absent ? (
                            <span className="text-red-600 font-bold">AB</span>
                          ) : eval1?.obtained !== null && eval1?.obtained !== undefined ? (
                            eval1.obtained
                          ) : (
                            '-'
                          )}
                        </td>

                        {/* 2nd Eval */}
                        <td className="py-2 px-1.5 border-r border-slate-300 text-center font-mono">
                          {eval2?.absent ? (
                            <span className="text-red-600 font-bold">AB</span>
                          ) : eval2?.obtained !== null && eval2?.obtained !== undefined ? (
                            eval2.obtained
                          ) : (
                            '-'
                          )}
                        </td>

                        {/* Combined Evaluation Weighted */}
                        {showWeightedBreakdown && (
                          <td className="py-2 px-1.5 border-r border-slate-300 text-center font-mono font-bold bg-teal-50/60 text-teal-900">
                            {evalWeighted !== undefined ? evalWeighted : '-'}
                          </td>
                        )}

                        {/* Half Yearly */}
                        <td className="py-2 px-1.5 border-r border-slate-300 text-center font-mono">
                          {half?.absent ? (
                            <span className="text-red-600 font-bold">AB</span>
                          ) : half?.obtained !== null && half?.obtained !== undefined ? (
                            half.obtained
                          ) : (
                            '-'
                          )}
                        </td>

                        {/* Half Yearly Weighted */}
                        {showWeightedBreakdown && (
                          <td className="py-2 px-1.5 border-r border-slate-300 text-center font-mono font-bold bg-teal-50/60 text-teal-900">
                            {halfWeighted !== undefined ? halfWeighted : '-'}
                          </td>
                        )}

                        {/* Annual */}
                        <td className="py-2 px-1.5 border-r border-slate-300 text-center font-mono">
                          {annual?.absent ? (
                            <span className="text-red-600 font-bold">AB</span>
                          ) : annual?.obtained !== null && annual?.obtained !== undefined ? (
                            annual.obtained
                          ) : (
                            '-'
                          )}
                        </td>

                        {/* Annual Weighted */}
                        {showWeightedBreakdown && (
                          <td className="py-2 px-1.5 border-r border-slate-300 text-center font-mono font-bold bg-teal-50/60 text-teal-900">
                            {annualWeighted !== undefined ? annualWeighted : '-'}
                          </td>
                        )}

                        {/* Final Weighted Total */}
                        <td
                          className={`py-2 px-2 border-r border-slate-300 text-center font-mono font-black bg-teal-100/40 ${
                            isSubjectPassed ? 'text-teal-950' : 'text-red-700'
                          }`}
                        >
                          {sr.weightedObtained !== null ? sr.weightedObtained : '-'}
                        </td>

                        {/* Grade */}
                        <td className="py-2 px-2 border-r border-slate-300 text-center font-bold">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-mono ${
                              sr.grade === 'F'
                                ? 'bg-red-100 text-red-800'
                                : sr.grade.startsWith('A')
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {sr.grade}
                          </span>
                        </td>

                        {/* Remark */}
                        <td className="py-2 px-2 text-center text-[11px] text-slate-600">
                          {isSubjectPassed ? 'Pass' : 'Backlog'}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary Grand Total Row */}
                  <tr className="bg-slate-200/90 font-bold border-t-2 border-slate-800 text-slate-900">
                    <td
                      colSpan={2}
                      className="py-2 px-3 border-r border-slate-400 text-right uppercase tracking-wider"
                    >
                      Grand Total:
                    </td>
                    <td className="py-2 px-2 border-r border-slate-400 text-center font-mono">
                      {totalFullMarks}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-400 text-center font-mono">
                      {Math.round(totalFullMarks * (resultSettings.passPercent / 100))}
                    </td>

                    {/* 1st Eval Total */}
                    <td className="py-2 px-1.5 border-r border-slate-400 text-center font-mono text-[11px]">
                      {colTotals.eval1}
                    </td>

                    {/* 2nd Eval Total */}
                    <td className="py-2 px-1.5 border-r border-slate-400 text-center font-mono text-[11px]">
                      {colTotals.eval2}
                    </td>

                    {/* Combined Eval Weighted Total */}
                    {showWeightedBreakdown && (
                      <td className="py-2 px-1.5 border-r border-slate-400 text-center font-mono font-bold text-teal-900 bg-teal-50">
                        {Math.round(colTotals.evalWeighted * 10) / 10}
                      </td>
                    )}

                    {/* Half Yearly Total */}
                    <td className="py-2 px-1.5 border-r border-slate-400 text-center font-mono text-[11px]">
                      {colTotals.half}
                    </td>

                    {/* Half Yearly Weighted Total */}
                    {showWeightedBreakdown && (
                      <td className="py-2 px-1.5 border-r border-slate-400 text-center font-mono font-bold text-teal-900 bg-teal-50">
                        {Math.round(colTotals.halfWeighted * 10) / 10}
                      </td>
                    )}

                    {/* Annual Total */}
                    <td className="py-2 px-1.5 border-r border-slate-400 text-center font-mono text-[11px]">
                      {colTotals.annual}
                    </td>

                    {/* Annual Weighted Total */}
                    {showWeightedBreakdown && (
                      <td className="py-2 px-1.5 border-r border-slate-400 text-center font-mono font-bold text-teal-900 bg-teal-50">
                        {Math.round(colTotals.annualWeighted * 10) / 10}
                      </td>
                    )}

                    {/* Final Composite Total */}
                    <td className="py-2 px-2 border-r border-slate-400 text-center font-mono font-black text-sm bg-teal-100 text-teal-950">
                      {totalObtained}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-400 text-center font-black text-sm">
                      {overallGrade}
                    </td>
                    <td className="py-2 px-2 text-center font-black text-xs">
                      {isPassed ? (
                        <span className="text-emerald-800">PASSED</span>
                      ) : (
                        <span className="text-red-700">FAILED</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Co-Scholastic Performance if present */}
          {coScholasticSubjects.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-teal-900 mb-1">
                <span>Part II: Co-Scholastic & Life Skills Assessment</span>
              </div>
              <div className="overflow-x-auto border border-slate-700">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-700 text-slate-900 font-bold">
                      <th className="py-1.5 px-3 border-r border-slate-300 w-10 text-center">Sl.</th>
                      <th className="py-1.5 px-3 border-r border-slate-300">Activity / Subject</th>
                      <th className="py-1.5 px-3 border-r border-slate-300 text-center w-24">Evaluation Grade</th>
                      <th className="py-1.5 px-3 text-center">Descriptive Indicator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {coScholasticSubjects.map((cs, idx) => (
                      <tr key={cs.subject.id} className="bg-white">
                        <td className="py-1.5 px-3 border-r border-slate-300 text-center font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-300 font-semibold text-slate-800">
                          {cs.subject.name}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-300 text-center font-bold font-mono">
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded">
                            {cs.grade || 'A'}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-slate-600 text-[11px] italic">
                          Demonstrates enthusiastic creative participation and disciplined teamwork.
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. Result Summary Statistics Panel */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="border border-slate-400 p-2 text-center bg-slate-50 rounded-xs">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Total Obtained
              </span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {totalObtained} / {totalFullMarks}
              </span>
            </div>

            <div className="border border-slate-400 p-2 text-center bg-slate-50 rounded-xs">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Percentage & Grade
              </span>
              <span className="text-base font-bold text-teal-800 font-mono">
                {percentage}% ({overallGrade})
              </span>
            </div>

            <div className="border border-slate-400 p-2 text-center bg-slate-50 rounded-xs">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Academic Result
              </span>
              <span
                className={`text-base font-bold font-mono ${
                  isPassed ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {isPassed ? 'PROMOTED' : 'NOT PROMOTED'}
              </span>
            </div>

            {resultSettings.showAttendance && (
              <div className="border border-slate-400 p-2 text-center bg-slate-50 rounded-xs">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Attendance
                </span>
                <span className="text-base font-bold text-slate-800 font-mono">
                  {studentResult.attendance || '94%'}
                </span>
              </div>
            )}
          </div>

          {/* Remarks Callout */}
          {resultSettings.showRemarks && (
            <div className="mt-3 p-2 bg-slate-50 border border-slate-300 rounded-xs text-xs flex items-center justify-between">
              <span className="font-semibold text-slate-700">General Remarks / Conduct:</span>
              <span className="font-medium text-slate-900 italic">
                {isPassed
                  ? 'Exemplary academic conduct. Promoted to higher class with merit.'
                  : 'Eligible for remedial coaching before academic advancement.'}
              </span>
            </div>
          )}

          {/* 5. Official Grading Scale Legend (SEBA/ASSEB Standard) */}
          <div className="mt-4 pt-3 border-t border-slate-300">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Grading Scale (Assam State School Education Board)
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 text-[10px] text-center font-mono border border-slate-300 p-1 bg-slate-50">
              {resultSettings.gradeScale.map((g) => (
                <div key={g.grade} className="border-r last:border-r-0 border-slate-300 p-0.5">
                  <div className="font-bold text-slate-900">{g.grade}</div>
                  <div className="text-slate-500 text-[9px]">{Math.floor(g.min)}-{Math.ceil(g.max)}%</div>
                  <div className="text-slate-700 text-[9px] font-sans truncate">{g.remark}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Official Signatures Block */}
          <div className="mt-10 pt-4 flex flex-col sm:flex-row items-end justify-between gap-6 text-xs text-slate-800">
            {/* Class Teacher Signature */}
            <div className="text-center w-48">
              <div className="h-10 border-b border-slate-800 mb-1 flex items-end justify-center font-serif italic text-slate-500">
                {/* Signature line */}
              </div>
              <p className="font-bold text-slate-900">
                {resultSettings.classTeacherSignatureLabel || 'Class Teacher Signature'}
              </p>
              <p className="text-[10px] text-slate-500">Date: {new Date().toLocaleDateString('en-GB')}</p>
            </div>

            {/* School Seal Stamp */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-400 flex flex-col items-center justify-center p-1 mx-auto text-[9px] text-slate-400 uppercase font-semibold">
                <span>School Seal</span>
                <span className="font-mono text-[8px]">06H1003</span>
              </div>
            </div>

            {/* Principal Signature */}
            <div className="text-center w-48">
              <div className="h-10 border-b border-slate-800 mb-1 flex items-end justify-center font-serif italic font-bold text-slate-800">
                {/* Principal Signature line */}
              </div>
              <p className="font-bold text-slate-900">
                {resultSettings.principalName || 'Principal / Headmaster'}
              </p>
              <p className="text-[10px] text-slate-500">Gopinath Bordoloi Sr. Sec. School</p>
            </div>
          </div>

          <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[10px] text-slate-400">
            This is an official computer-generated Progress Report verified under the ASSEB Div-I portal guidelines.
          </div>
        </div>
      </div>
    </div>
  );
};
