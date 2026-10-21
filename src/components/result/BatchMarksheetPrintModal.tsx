import React from 'react';
import { Printer, X, Award, CheckCircle2 } from 'lucide-react';
import { StudentResult, ClassInfo, ResultSettings, SchoolInfo } from '../../types';
import { SchoolLogo } from '../common/SchoolLogo';

interface BatchMarksheetPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClass: ClassInfo;
  results: StudentResult[];
  settings: ResultSettings;
  schoolInfo: SchoolInfo;
}

export const BatchMarksheetPrintModal: React.FC<BatchMarksheetPrintModalProps> = ({
  isOpen,
  onClose,
  targetClass,
  results,
  settings,
  schoolInfo,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const showWeightedBreakdown = settings.showWeightedBreakdown !== false;

  const evalGroup = settings.examGroups?.find((g) =>
    g.examTypeIds.includes('eval-1') || g.id === 'grp-eval'
  ) || { id: 'grp-eval', name: 'Evaluation', percent: 20, examTypeIds: ['eval-1', 'eval-2'] };

  const halfGroup = settings.examGroups?.find((g) =>
    g.examTypeIds.includes('half-yearly') || g.id === 'grp-half-yearly'
  ) || { id: 'grp-half-yearly', name: 'Half Yearly', percent: 30, examTypeIds: ['half-yearly'] };

  const annualGroup = settings.examGroups?.find((g) =>
    g.examTypeIds.includes('annual') || g.id === 'grp-annual'
  ) || { id: 'grp-annual', name: 'Annual', percent: 50, examTypeIds: ['annual'] };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full my-4 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Toolbar (hidden on actual paper print) */}
        <div className="no-print p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Printer className="w-5 h-5 text-teal-600" />
              Batch Print Marksheets - Class {targetClass.name}
            </h3>
            <p className="text-xs text-slate-500">
              Ready to print {results.length} progress reports with individual page breaks
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print All ({results.length} Marksheets)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area with Page Breaks */}
        <div className="overflow-y-auto p-4 sm:p-8 space-y-12 print:space-y-0 print:p-0">
          {results.map((res) => {
            const { student, rank, subjectResults, totalObtained, totalFullMarks, percentage, overallGrade, isPassed } = res;
            const scholasticSubjects = subjectResults.filter((sr) => sr.subject.type === 'marks');

            return (
              <div
                key={student.id}
                className="print-page border-2 border-slate-300 p-6 rounded-sm bg-white relative print:border-none print:p-6 print:m-0 print:break-after-page"
                style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
              >
                {/* Official Border */}
                <div className="border-4 border-double border-teal-900/80 p-5 rounded-xs">
                  {/* Header */}
                  <div className="text-center pb-3 border-b-2 border-slate-800">
                    <p className="text-xs font-bold tracking-widest text-slate-700 uppercase">
                      {schoolInfo.boardName}
                    </p>
                    <h1 className="text-xl font-black text-slate-900 uppercase">
                      {schoolInfo.name}
                    </h1>
                    <p className="text-xs text-slate-600">
                      PAGLAHAT, DIST: DHUBRI (ASSAM) • SCHOOL CODE: {schoolInfo.code}
                    </p>
                    <div className="mt-2 py-1 px-3 bg-teal-800 text-white rounded font-bold text-xs uppercase inline-block">
                      {settings.marksheetTitle || 'PROGRESS REPORT / MARKSHEET 2026-2027'}
                    </div>
                  </div>

                  {/* Student Details Grid */}
                  <div className="mt-3 border border-slate-700 text-xs">
                    <div className="grid grid-cols-2 divide-x divide-slate-700">
                      <div className="divide-y divide-slate-300">
                        <div className="p-1 bg-slate-50 flex justify-between">
                          <span className="font-semibold text-slate-600">Student:</span>
                          <span className="font-bold text-slate-900 uppercase">{student.name}</span>
                        </div>
                        <div className="p-1 flex justify-between">
                          <span className="font-semibold text-slate-600">Father's Name:</span>
                          <span className="font-medium text-slate-800 uppercase">{student.fatherName}</span>
                        </div>
                        <div className="p-1 bg-slate-50 flex justify-between">
                          <span className="font-semibold text-slate-600">Date of Birth:</span>
                          <span className="font-mono">{student.dob}</span>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-300">
                        <div className="p-1 bg-slate-50 flex justify-between">
                          <span className="font-semibold text-slate-600">Reg No:</span>
                          <span className="font-mono font-bold">{student.registrationNo}</span>
                        </div>
                        <div className="p-1 flex justify-between">
                          <span className="font-semibold text-slate-600">Class & Roll:</span>
                          <span className="font-medium">Class {targetClass.name} • Roll {student.rollNo} (Sec {student.section})</span>
                        </div>
                        <div className="p-1 bg-slate-50 flex justify-between">
                          <span className="font-semibold text-slate-600">Academic Year:</span>
                          <span className="font-mono">{student.academicYear}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Marks Table */}
                  <div className="mt-3">
                    <table className="w-full text-[11px] text-left border border-slate-700 border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-700 text-slate-900 font-bold">
                          <th className="py-1 px-1.5 border-r border-slate-300 text-center w-8">Sl.</th>
                          <th className="py-1 px-2 border-r border-slate-300">Subject Name</th>
                          <th className="py-1 px-1.5 border-r border-slate-300 text-center w-10">Full</th>
                          <th className="py-1 px-1.5 border-r border-slate-300 text-center w-10">Pass</th>
                          <th className="py-1 px-1 border-r border-slate-300 text-center text-[10px]">
                            1st Eval (50)
                          </th>
                          <th className="py-1 px-1 border-r border-slate-300 text-center text-[10px]">
                            2nd Eval (50)
                          </th>
                          {showWeightedBreakdown && (
                            <th className="py-1 px-1 border-r border-slate-300 text-center text-[10px] bg-teal-50 text-teal-900 font-black">
                              {evalGroup.name} ({evalGroup.percent})
                            </th>
                          )}
                          <th className="py-1 px-1 border-r border-slate-300 text-center text-[10px]">
                            Half Yearly (100)
                          </th>
                          {showWeightedBreakdown && (
                            <th className="py-1 px-1 border-r border-slate-300 text-center text-[10px] bg-teal-50 text-teal-900 font-black">
                              {halfGroup.name} ({halfGroup.percent})
                            </th>
                          )}
                          <th className="py-1 px-1 border-r border-slate-300 text-center text-[10px]">
                            Annual (100)
                          </th>
                          {showWeightedBreakdown && (
                            <th className="py-1 px-1 border-r border-slate-300 text-center text-[10px] bg-teal-50 text-teal-900 font-black">
                              {annualGroup.name} ({annualGroup.percent})
                            </th>
                          )}
                          <th className="py-1 px-1.5 border-r border-slate-300 text-center bg-teal-100 font-black">
                            Total (100)
                          </th>
                          <th className="py-1 px-1.5 text-center w-12">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {scholasticSubjects.map((sr, idx) => {
                          const eval1 = sr.examMarks['eval-1'];
                          const eval2 = sr.examMarks['eval-2'];
                          const half = sr.examMarks['half-yearly'];
                          const annual = sr.examMarks['annual'];
                          const evalWeighted = sr.groupScores[evalGroup.id]?.weightedScore;
                          const halfWeighted = sr.groupScores[halfGroup.id]?.weightedScore;
                          const annualWeighted = sr.groupScores[annualGroup.id]?.weightedScore;

                          return (
                            <tr key={sr.subject.id}>
                              <td className="py-1 px-1.5 border-r border-slate-300 text-center font-mono">{idx + 1}</td>
                              <td className="py-1 px-2 border-r border-slate-300 font-semibold">{sr.subject.name}</td>
                              <td className="py-1 px-1.5 border-r border-slate-300 text-center font-mono">{sr.fullMarks}</td>
                              <td className="py-1 px-1.5 border-r border-slate-300 text-center font-mono text-slate-600">{sr.passMarks}</td>
                              <td className="py-1 px-1 border-r border-slate-300 text-center font-mono">
                                {eval1?.absent ? 'AB' : eval1?.obtained ?? '-'}
                              </td>
                              <td className="py-1 px-1 border-r border-slate-300 text-center font-mono">
                                {eval2?.absent ? 'AB' : eval2?.obtained ?? '-'}
                              </td>
                              {showWeightedBreakdown && (
                                <td className="py-1 px-1 border-r border-slate-300 text-center font-mono font-bold bg-teal-50/50 text-teal-900">
                                  {evalWeighted ?? '-'}
                                </td>
                              )}
                              <td className="py-1 px-1 border-r border-slate-300 text-center font-mono">
                                {half?.absent ? 'AB' : half?.obtained ?? '-'}
                              </td>
                              {showWeightedBreakdown && (
                                <td className="py-1 px-1 border-r border-slate-300 text-center font-mono font-bold bg-teal-50/50 text-teal-900">
                                  {halfWeighted ?? '-'}
                                </td>
                              )}
                              <td className="py-1 px-1 border-r border-slate-300 text-center font-mono">
                                {annual?.absent ? 'AB' : annual?.obtained ?? '-'}
                              </td>
                              {showWeightedBreakdown && (
                                <td className="py-1 px-1 border-r border-slate-300 text-center font-mono font-bold bg-teal-50/50 text-teal-900">
                                  {annualWeighted ?? '-'}
                                </td>
                              )}
                              <td className="py-1 px-1.5 border-r border-slate-300 text-center font-mono font-bold bg-teal-100/50">
                                {sr.weightedObtained ?? '-'}
                              </td>
                              <td className="py-1 px-1.5 text-center font-bold">
                                {sr.grade}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-slate-200 font-bold border-t-2 border-slate-800 text-slate-900">
                          <td colSpan={2} className="py-1 px-2 border-r border-slate-400 text-right uppercase">
                            Grand Total:
                          </td>
                          <td className="py-1 px-1.5 border-r border-slate-400 text-center font-mono">{totalFullMarks}</td>
                          <td className="py-1 px-1.5 border-r border-slate-400 text-center font-mono">{Math.round(totalFullMarks * (settings.passPercent / 100))}</td>
                          <td
                            colSpan={showWeightedBreakdown ? 7 : 4}
                            className="py-1 px-1 border-r border-slate-400 text-center text-[10px] text-slate-600 uppercase"
                          >
                            Weighted Composite Total
                          </td>
                          <td className="py-1 px-1.5 border-r border-slate-400 text-center font-black bg-teal-100">
                            {totalObtained}
                          </td>
                          <td className="py-1 px-1.5 text-center font-black">
                            {overallGrade}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Bar */}
                  <div className="mt-3 grid grid-cols-4 gap-2 text-xs border border-slate-400 p-1.5 bg-slate-50 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Total Marks:</span>
                      <span className="font-bold font-mono">{totalObtained} / {totalFullMarks}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Percentage:</span>
                      <span className="font-bold font-mono">{percentage}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Grade:</span>
                      <span className="font-bold">{overallGrade}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Result:</span>
                      <span className={`font-bold ${isPassed ? 'text-emerald-700' : 'text-red-700'}`}>
                        {isPassed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="mt-8 pt-3 border-t border-slate-300 flex justify-between text-[11px] text-slate-700">
                    <div className="text-center w-36">
                      <div className="border-b border-slate-700 mb-1 h-6"></div>
                      <span>{settings.classTeacherSignatureLabel || 'Class Teacher'}</span>
                    </div>
                    <div className="text-center w-36">
                      <div className="border-b border-slate-700 mb-1 h-6"></div>
                      <span>{settings.principalName || 'Principal'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
