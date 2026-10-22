import React, { useState, useMemo } from 'react';
import { Calendar, Filter, BookOpen } from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { ClassSelector } from '../common/ClassSelector';
import { ExamTable } from '../common/ExamTable';
import { getCurrentAcademicYear } from '../../utils/dateUtils';
import { ExamStudentListPage } from './ExamStudentListPage';
import { CandidateMarksEntryPage } from './CandidateMarksEntryPage';

interface MarksEntryPageProps {
  classId?: string;
  examId?: string;
  studentId?: string;
}

export const MarksEntryPage: React.FC<MarksEntryPageProps> = ({
  classId,
  examId,
  studentId,
}) => {
  const { classes, exams, navigateTo } = usePortal();

  // 1. If both examId and studentId are present: render Step 4 Candidate Marks Entry Sheet
  if (classId && examId && studentId) {
    return (
      <CandidateMarksEntryPage
        classId={classId}
        examId={examId}
        studentId={studentId}
      />
    );
  }

  // 2. If examId is present: render full Exam Student List (Step 3 main view)
  if (classId && examId) {
    return <ExamStudentListPage classId={classId} examId={examId} />;
  }

  // 3. Otherwise: render Select Class & List of Examinations
  const defaultYear = getCurrentAcademicYear();
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');

  const selectedClass = classes.find((c) => c.id === classId);

  // Distinct academic years
  const distinctYears = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((e) => set.add(e.academicYear));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [exams]);

  // Filter exams for this class
  const classExams = useMemo(() => {
    if (!classId) return [];
    return exams.filter((e) => e.classId === classId);
  }, [exams, classId]);

  // Group class exams by academic year
  const groupedExams = useMemo(() => {
    const groups: { year: string; exams: typeof classExams }[] = [];
    const yearsToDisplay =
      selectedYearFilter === 'all'
        ? distinctYears
        : distinctYears.filter((y) => y === selectedYearFilter);

    yearsToDisplay.forEach((year) => {
      const examsForYear = classExams.filter((e) => e.academicYear === year);
      if (examsForYear.length > 0 || selectedYearFilter !== 'all') {
        groups.push({
          year,
          exams: examsForYear,
        });
      }
    });

    return groups;
  }, [classExams, distinctYears, selectedYearFilter]);

  return (
    <div className="space-y-6">
      {/* 1. Select Class Card */}
      <ClassSelector
        selectedClassId={classId}
        onSelectClass={(cId) => navigateTo(`/marks-entry/${cId}`)}
      />

      {/* 2. List of Examinations for selected class */}
      {selectedClass ? (
        <section
          aria-labelledby="class-exams-heading"
          className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 md:p-6"
        >
          {/* Card Header matching reference portal */}
          <div className="border-b border-slate-300 pb-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2
                id="class-exams-heading"
                className="text-[#0f766e] font-bold text-base md:text-lg tracking-tight"
              >
                List of Examinations Class {selectedClass.name} {defaultYear}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All examinations configured for Class {selectedClass.name} across academic sessions
              </p>
            </div>

            {/* Academic Year dropdown filter at top right */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="academic-year-filter"
                className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Filter className="w-3.5 h-3.5 text-teal-700" />
                <span>Academic Year:</span>
              </label>
              <select
                id="academic-year-filter"
                value={selectedYearFilter}
                onChange={(e) => setSelectedYearFilter(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-600 cursor-pointer"
              >
                <option value="all">All Academic Years</option>
                {distinctYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr} {yr === defaultYear ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grouped Tables by Academic Year */}
          {groupedExams.length > 0 ? (
            <div className="space-y-6">
              {groupedExams.map((group) => (
                <div key={group.year} className="space-y-2">
                  <div className="flex items-center justify-between py-1 px-1">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#0f766e]" />
                      <span>Academic Session: {group.year}</span>
                      {group.year === defaultYear && (
                        <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.2 rounded font-semibold ml-2">
                          Active Session
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {group.exams.length} Examination{group.exams.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <ExamTable
                    exams={group.exams}
                    emptyMessage={`No examinations scheduled for Class ${selectedClass.name} in session ${group.year}.`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs">
              No examination records found for Class {selectedClass.name}. You can create them in the <strong>Exam Setup</strong> section.
            </div>
          )}
        </section>
      ) : (
        /* Empty guidance card if no class is selected yet */
        <div className="bg-white rounded-lg border border-dashed border-slate-300 p-8 text-center space-y-2 text-slate-500">
          <BookOpen className="w-8 h-8 text-teal-600 mx-auto opacity-70" />
          <h3 className="text-sm font-bold text-slate-700">
            Please Select a Class Above
          </h3>
          <p className="text-xs max-w-md mx-auto text-slate-500">
            Click on any of the 14 class chips above (Ankur to Twelve) to view its scheduled examinations and access the internal marks entry system.
          </p>
        </div>
      )}
    </div>
  );
};
