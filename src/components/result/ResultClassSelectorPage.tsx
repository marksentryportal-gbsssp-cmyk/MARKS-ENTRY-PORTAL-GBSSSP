import React, { useMemo } from 'react';
import {
  Award,
  Settings,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { computeClassResults } from '../../utils/resultCalculator';

export const ResultClassSelectorPage: React.FC = () => {
  const {
    classes,
    students,
    subjects,
    exams,
    examTypes,
    marks,
    resultSettings,
    navigateTo,
  } = usePortal();

  const currentAcademicYear = '2026-2027';

  // Compute summary metrics per class
  const classSummaries = useMemo(() => {
    return classes.map((cls) => {
      const classStudents = students.filter(
        (s) => s.classId === cls.id && s.active
      );
      const classSubjects = subjects.filter((s) => s.classId === cls.id);

      // Compute results if students exist
      let passedCount = 0;
      let totalStudents = classStudents.length;
      let hasMarks = false;

      if (totalStudents > 0) {
        const results = computeClassResults(
          cls.id,
          currentAcademicYear,
          students,
          subjects,
          exams,
          examTypes,
          marks,
          resultSettings
        );
        passedCount = results.filter((r) => r.isPassed).length;
        hasMarks = results.some((r) => r.totalObtained > 0);
      }

      return {
        cls,
        totalStudents,
        subjectsCount: classSubjects.length,
        passedCount,
        hasMarks,
      };
    });
  }, [classes, students, subjects, exams, examTypes, marks, resultSettings]);

  const totalSchoolStudents = students.filter((s) => s.active).length;
  const totalClassesCount = classes.length;
  const weightageSummary = resultSettings.weightage
    .map((w) => {
      const et = examTypes.find((e) => e.id === w.examTypeId);
      return `${et?.shortName || w.examTypeId}: ${w.percent}%`;
    })
    .join('  •  ');

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview Card */}
      <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
                <Award className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-teal-800">
                  Annual Results & Marksheet Generation
                </h1>
                <p className="text-sm text-slate-500">
                  Academic Session: {resultSettings.session || currentAcademicYear} • Assam State School Education Board Standard
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigateTo('/result/settings')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold transition-colors shadow-xs cursor-pointer self-start md:self-auto"
          >
            <Settings className="w-4 h-4 text-teal-400" />
            Result & Weightage Settings
          </button>
        </div>

        {/* Evaluation Formula Notification Bar */}
        <div className="mt-4 p-3.5 bg-gradient-to-r from-teal-50/70 via-slate-50 to-blue-50/50 rounded-lg border border-teal-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs md:text-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="font-semibold text-teal-900">Current Evaluation Weightage Formula:</span>
            <span className="font-medium text-slate-700 font-mono text-xs">{weightageSummary}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-100 text-teal-800 font-medium text-xs">
            Pass Threshold: {resultSettings.passPercent}%
          </span>
        </div>

        {/* Global Summary Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
            <span className="text-xs text-slate-500 font-medium block">Total Classes</span>
            <span className="text-lg font-bold text-slate-800">{totalClassesCount}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
            <span className="text-xs text-slate-500 font-medium block">Active Students</span>
            <span className="text-lg font-bold text-slate-800">{totalSchoolStudents}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
            <span className="text-xs text-slate-500 font-medium block">Curriculum Subjects</span>
            <span className="text-lg font-bold text-teal-700">{subjects.length} total</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
            <span className="text-xs text-slate-500 font-medium block">Grading Standard</span>
            <span className="text-lg font-bold text-purple-700">8-Grade Scale (A1-F)</span>
          </div>
        </div>
      </div>

      {/* Class Selection Grid */}
      <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 md:p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-600" />
              Select Class to View Result & Tabulation Sheet
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Select any class below to inspect the consolidated merit list, print official marksheets, or export tabulation
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {classSummaries.map(({ cls, totalStudents, subjectsCount, passedCount, hasMarks }) => {
            const isFeatured = cls.id === 'nine' || cls.id === 'ten';

            return (
              <div
                key={cls.id}
                onClick={() => navigateTo(`/result/${cls.id}`)}
                className={`group relative rounded-xl border p-4.5 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isFeatured
                    ? 'border-teal-300 bg-gradient-to-br from-white via-teal-50/20 to-slate-50 shadow-xs hover:shadow-md hover:border-teal-500'
                    : 'border-slate-200 bg-white hover:border-teal-400 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600">
                        Class {cls.order}
                      </span>
                      <h3 className="text-base font-bold text-slate-800 group-hover:text-teal-700 transition-colors">
                        Class {cls.name}
                      </h3>
                    </div>

                    {hasMarks ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        Ready
                      </span>
                    ) : totalStudents > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                        Enrolled
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                        Empty
                      </span>
                    )}
                  </div>

                  <div className="mt-3.5 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Candidates:
                      </span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {totalStudents} Students
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                        Subjects:
                      </span>
                      <span className="font-medium text-slate-700">
                        {subjectsCount} Subjects
                      </span>
                    </div>

                    {hasMarks && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-slate-500">Pass Rate:</span>
                        <span className="font-semibold text-emerald-700">
                          {totalStudents > 0 ? Math.round((passedCount / totalStudents) * 100) : 0}% ({passedCount}/{totalStudents})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-700 group-hover:text-teal-800">
                  <span>View Tabulation & Marksheets</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
