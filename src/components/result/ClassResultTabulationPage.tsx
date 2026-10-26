import React, { useState, useMemo } from 'react';
import {
  Award,
  ArrowLeft,
  Printer,
  Download,
  Settings,
  Search,
  Filter,
  BarChart3,
  Table as TableIcon,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Users,
  Trophy,
  Sparkles
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { computeClassResults } from '../../utils/resultCalculator';
import { BatchMarksheetPrintModal } from './BatchMarksheetPrintModal';

interface ClassResultTabulationPageProps {
  classId: string;
}

export const ClassResultTabulationPage: React.FC<ClassResultTabulationPageProps> = ({
  classId,
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
    addToast,
  } = usePortal();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedYear, setSelectedYear] = useState('2026-2027');
  const [viewMode, setViewMode] = useState<'table' | 'analytics'>('table');
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState(false);

  const targetClass = classes.find((c) => c.id === classId);

  // Compute full class results
  const allResults = useMemo(() => {
    return computeClassResults(
      classId,
      selectedYear,
      students,
      subjects,
      exams,
      examTypes,
      marks,
      resultSettings
    );
  }, [classId, selectedYear, students, subjects, exams, examTypes, marks, resultSettings]);

  // Scholastic subjects in order
  const scholasticSubjects = useMemo(() => {
    return subjects
      .filter((s) => s.classId === classId && s.type === 'marks')
      .sort((a, b) => a.order - b.order);
  }, [subjects, classId]);

  // Filtered results by search and section
  const filteredResults = useMemo(() => {
    return allResults.filter((res) => {
      const matchesSearch =
        res.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.student.rollNo.includes(searchQuery) ||
        (res.student.registrationNo && res.student.registrationNo.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSection =
        selectedSection === 'all' || res.student.section === selectedSection;

      return matchesSearch && matchesSection;
    });
  }, [allResults, searchQuery, selectedSection]);

  // Overall statistics
  const totalStudents = allResults.length;
  const passedStudents = allResults.filter((r) => r.isPassed).length;
  const failedStudents = totalStudents - passedStudents;
  const passRate = totalStudents > 0 ? Math.round((passedStudents / totalStudents) * 100) : 0;
  const classTopper = allResults.length > 0 ? allResults[0] : null;

  const averagePercentage = useMemo(() => {
    if (totalStudents === 0) return 0;
    const sum = allResults.reduce((acc, r) => acc + r.percentage, 0);
    return Math.round((sum / totalStudents) * 10) / 10;
  }, [allResults, totalStudents]);

  // Track candidates with missing/incomplete marks in any group exam
  const studentsWithMissingMarks = useMemo(() => {
    return allResults.filter((r) => r.hasMissingMarks);
  }, [allResults]);

  // Grade scale distribution calculation
  const gradeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    resultSettings.gradeScale.forEach((g) => {
      counts[g.grade] = 0;
    });
    allResults.forEach((r) => {
      counts[r.overallGrade] = (counts[r.overallGrade] || 0) + 1;
    });
    return counts;
  }, [allResults, resultSettings.gradeScale]);

  // Export Tabulation Sheet to CSV
  const handleExportCSV = () => {
    if (filteredResults.length === 0) {
      addToast('No student data to export', 'error');
      return;
    }

    const headers = [
      'Rank',
      'Roll No',
      'Registration No',
      'Student Name',
      'Father Name',
      'Section',
      'Gender',
      ...scholasticSubjects.map((s) => `${s.code ? `[${s.code}] ` : ''}${s.name} (100)`),
      'Grand Total',
      'Percentage (%)',
      'Grade',
      'Result Status',
    ];

    const rows = filteredResults.map((r) => {
      const subjectScores = scholasticSubjects.map((s) => {
        const sr = r.subjectResults.find((subRes) => subRes.subject.id === s.id);
        return sr && sr.weightedObtained !== null ? sr.weightedObtained : 'N/A';
      });

      return [
        r.rank,
        `"${r.student.rollNo}"`,
        `"${r.student.registrationNo}"`,
        `"${r.student.name}"`,
        `"${r.student.fatherName}"`,
        r.student.section,
        r.student.gender,
        ...subjectScores,
        r.totalObtained,
        `${r.percentage}%`,
        r.overallGrade,
        r.isPassed ? 'PASSED' : 'NEEDS IMPROVEMENT',
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `TABULATION_CLASS_${targetClass?.name.toUpperCase()}_${selectedYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    addToast('Tabulation CSV downloaded successfully', 'success');
  };

  if (!targetClass) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <p className="text-slate-600">Selected class not found.</p>
        <button
          type="button"
          onClick={() => navigateTo('/result')}
          className="mt-3 px-4 py-2 bg-teal-700 text-white rounded text-sm font-semibold"
        >
          Back to Classes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Class Header */}
      <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <button
              type="button"
              onClick={() => navigateTo('/result')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All Classes
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">
                Class {targetClass.name} - Consolidated Result & Tabulation Sheet
              </h1>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Annual composite evaluation with multi-examination weightage • Session: {selectedYear}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsBatchPrintOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-purple-700 hover:bg-purple-800 text-white text-xs md:text-sm font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Marksheets (Batch)
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs md:text-sm font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Export CSV
            </button>

            <button
              type="button"
              onClick={() => navigateTo('/result/settings')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs md:text-sm font-semibold transition-colors cursor-pointer"
              title="Open Result Settings"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              Settings
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
            <span className="text-xs text-slate-500 font-medium block">Total Candidates</span>
            <span className="text-xl font-bold text-slate-800 font-mono">{totalStudents}</span>
          </div>

          <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200/80">
            <span className="text-xs text-emerald-700 font-medium block">Passed & Promoted</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-emerald-800 font-mono">{passedStudents}</span>
              <span className="text-xs text-emerald-600 font-semibold">({passRate}%)</span>
            </div>
          </div>

          <div className="bg-red-50/60 p-3 rounded-lg border border-red-200/80">
            <span className="text-xs text-red-700 font-medium block">Needs Remediation</span>
            <span className="text-xl font-bold text-red-800 font-mono">{failedStudents}</span>
          </div>

          <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200/80">
            <span className="text-xs text-amber-700 font-medium block flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-600" />
              Class Topper
            </span>
            <span className="text-xs font-bold text-slate-900 truncate block mt-1" title={classTopper?.student.name}>
              {classTopper ? classTopper.student.name.split(' ')[0] : 'N/A'}
            </span>
            <span className="text-xs font-semibold text-amber-800 font-mono">
              {classTopper ? `${classTopper.percentage}% (Rank 1)` : '-'}
            </span>
          </div>

          <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-200/80 col-span-2 sm:col-span-1">
            <span className="text-xs text-blue-700 font-medium block">Class Average</span>
            <span className="text-xl font-bold text-blue-900 font-mono">{averagePercentage}%</span>
          </div>
        </div>

        {/* Readiness Warning if any candidates have missing marks in a combined group */}
        {studentsWithMissingMarks.length > 0 && (
          <div className="mt-4 p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">
                Evaluation Readiness Notice: {studentsWithMissingMarks.length} candidate(s) have pending marks in one or more exams of a combined evaluation group.
              </span>
              <span className="text-amber-800 text-[11px] block mt-0.5">
                Per ASSEB portal rules, current results for these candidates are computed from available marks. Please complete all marks entries to finalize composite evaluation scores before generating final promotion reports.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 md:p-6">
        {/* Filters & View Mode Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-4 border-b border-slate-200 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-100 text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                Tabulation Table
              </button>

              <button
                type="button"
                onClick={() => setViewMode('analytics')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded transition-all cursor-pointer ${
                  viewMode === 'analytics'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Grade Analytics
              </button>
            </div>

            {/* Section filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 ml-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Section:</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="px-2 py-1 text-xs rounded border border-slate-300 bg-white focus:outline-teal-600"
              >
                <option value="all">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
              </select>
            </div>
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by student, roll..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-teal-600 focus:border-teal-600"
            />
          </div>
        </div>

        {/* Tab 1: Tabulation Table */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-2.5 text-center w-12 border-r border-slate-200">Rank</th>
                  <th className="py-2.5 px-2 text-center w-12 border-r border-slate-200">Roll</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Registration No</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[180px]">Student Name</th>
                  {scholasticSubjects.map((sub) => (
                    <th
                      key={sub.id}
                      className="py-2 px-2 text-center border-r border-slate-200 font-semibold"
                      title={`${sub.name} (Code: ${sub.code || 'N/A'}, Full Marks: ${sub.fullMarks})`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="truncate max-w-[80px] inline-block">
                          {sub.name.replace('(MIL)', '').replace('(Core)', '').trim()}
                        </span>
                        {sub.code && (
                          <span className="text-[9px] font-mono font-bold text-teal-800 bg-teal-50 px-1 py-0.2 rounded border border-teal-200">
                            {sub.code}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="py-2.5 px-2 text-center border-r border-slate-200 bg-slate-200/50">Total</th>
                  <th className="py-2.5 px-2 text-center border-r border-slate-200">Pct %</th>
                  <th className="py-2.5 px-2 text-center border-r border-slate-200 w-12">Grade</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-200">Status</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={scholasticSubjects.length + 8} className="py-8 text-center text-slate-400">
                      No students found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((res) => {
                    const isTopper = res.rank === 1;
                    const isSecond = res.rank === 2;
                    const isThird = res.rank === 3;

                    return (
                      <tr
                        key={res.student.id}
                        className="hover:bg-teal-50/40 transition-colors"
                      >
                        {/* Rank Badge */}
                        <td className="py-2 px-2 text-center font-bold font-mono border-r border-slate-200">
                          {isTopper ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-black shadow-2xs">
                              1
                            </span>
                          ) : isSecond ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800 text-xs font-black">
                              2
                            </span>
                          ) : isThird ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-200/60 text-amber-900 text-xs font-black">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-600">{res.rank}</span>
                          )}
                        </td>

                        {/* Roll */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                          {res.student.rollNo}
                        </td>

                        {/* Reg No */}
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600 border-r border-slate-200">
                          {res.student.registrationNo}
                        </td>

                        {/* Name */}
                        <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200">
                          <button
                            type="button"
                            onClick={() =>
                              navigateTo(`/result/${classId}/student/${res.student.id}`)
                            }
                            className="hover:text-teal-700 text-left hover:underline cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{res.student.name}</span>
                            {res.hasMissingMarks && (
                              <span
                                className="inline-flex items-center text-[9px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300"
                                title="Pending marks in one or more exams of a group"
                              >
                                Partial
                              </span>
                            )}
                          </button>
                          <span className="text-[10px] text-slate-400 font-normal">
                            F: {res.student.fatherName}
                          </span>
                        </td>

                        {/* Subject Marks */}
                        {scholasticSubjects.map((sub) => {
                          const sr = res.subjectResults.find((s) => s.subject.id === sub.id);
                          const score = sr?.weightedObtained;
                          const isSubPassed = sr?.isPassed;

                          return (
                            <td
                              key={sub.id}
                              className={`py-2 px-2 text-center font-mono border-r border-slate-200 ${
                                isSubPassed ? 'text-slate-800' : 'text-red-700 font-bold bg-red-50/50'
                              }`}
                            >
                              {score !== null && score !== undefined ? score : '-'}
                            </td>
                          );
                        })}

                        {/* Grand Total */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-900 border-r border-slate-200 bg-slate-50">
                          {res.totalObtained}
                        </td>

                        {/* Percentage */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-teal-800 border-r border-slate-200">
                          {res.percentage}%
                        </td>

                        {/* Grade */}
                        <td className="py-2 px-2 text-center border-r border-slate-200 font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                              res.overallGrade.startsWith('A')
                                ? 'bg-emerald-100 text-emerald-800'
                                : res.overallGrade.startsWith('B')
                                ? 'bg-blue-100 text-blue-800'
                                : res.overallGrade.startsWith('C')
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {res.overallGrade}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-2 px-3 text-center border-r border-slate-200">
                          {res.isPassed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              PASS
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700"
                              title={`Failed in: ${res.failedSubjectNames.join(', ')}`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              FAIL
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              navigateTo(`/result/${classId}/student/${res.student.id}`)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            Marksheet
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Grade Analytics View */}
        {viewMode === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                Class Grade Scale Distribution (SEBA Standard)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {resultSettings.gradeScale.map((scale) => {
                  const count = gradeDistribution[scale.grade] || 0;
                  const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;

                  return (
                    <div
                      key={scale.grade}
                      className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-center"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span className="font-bold text-slate-800 text-sm">{scale.grade}</span>
                        <span className="text-[10px]">{Math.floor(scale.min)}-{Math.ceil(scale.max)}%</span>
                      </div>
                      <div className="text-xl font-bold text-teal-800 font-mono">{count}</div>
                      <div className="text-[10px] text-slate-500 mt-1">{pct}% of class</div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-teal-600 h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subject-Wise Performance Breakdown */}
            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-3">
                Subject-Wise Performance & Pass Rates
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {scholasticSubjects.map((sub) => {
                  let subPassed = 0;
                  let maxScore = 0;
                  let sumScore = 0;

                  allResults.forEach((r) => {
                    const sr = r.subjectResults.find((s) => s.subject.id === sub.id);
                    if (sr && sr.weightedObtained !== null) {
                      sumScore += sr.weightedObtained;
                      if (sr.weightedObtained > maxScore) maxScore = sr.weightedObtained;
                      if (sr.isPassed) subPassed++;
                    }
                  });

                  const subAvg = totalStudents > 0 ? Math.round((sumScore / totalStudents) * 10) / 10 : 0;
                  const subPassRate = totalStudents > 0 ? Math.round((subPassed / totalStudents) * 100) : 0;

                  return (
                    <div
                      key={sub.id}
                      className="border border-slate-200 rounded-lg p-3.5 bg-white shadow-2xs"
                    >
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{sub.name}</h4>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-slate-50 p-1.5 rounded">
                          <span className="text-[10px] text-slate-500 block">Average</span>
                          <span className="font-bold text-slate-800 font-mono">{subAvg}</span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded">
                          <span className="text-[10px] text-slate-500 block">Highest</span>
                          <span className="font-bold text-teal-700 font-mono">{maxScore}</span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded">
                          <span className="text-[10px] text-slate-500 block">Pass Rate</span>
                          <span className="font-bold text-emerald-700 font-mono">{subPassRate}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Batch Print Modal Overlay */}
      <BatchMarksheetPrintModal
        isOpen={isBatchPrintOpen}
        onClose={() => setIsBatchPrintOpen(false)}
        targetClass={targetClass}
        results={filteredResults}
        settings={resultSettings}
        schoolInfo={schoolInfo}
      />
    </div>
  );
};
