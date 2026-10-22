import React, { useRef, useEffect } from 'react';
import { CheckCircle2, Award, UserX, AlertCircle } from 'lucide-react';
import { Subject, ExamRecord } from '../../types';
import { MarksComponentInput } from './MarksComponentInput';

export interface SubjectMarksValues {
  descriptive: string;
  practical: string;
  ia: string;
  grade?: string;
}

interface SubjectMarksTableProps {
  subjects: Subject[];
  exam: ExamRecord;
  marksState: Record<string, SubjectMarksValues>;
  onMarksChange: (
    subjectId: string,
    component: 'descriptive' | 'practical' | 'ia',
    value: string
  ) => void;
  onGradeChange: (subjectId: string, grade: string) => void;
  validationErrors: Record<string, string>;
  disabled?: boolean;
}

export const ALLOWED_GRADES = ['A+', 'A', 'B+', 'B', 'C', 'D', 'E', 'ABSENT'];

export const SubjectMarksTable: React.FC<SubjectMarksTableProps> = ({
  subjects,
  exam,
  marksState,
  onMarksChange,
  onGradeChange,
  validationErrors,
  disabled = false,
}) => {
  // Store refs to inputs for sequential Tab/Enter traversal
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Helper to extract component config for this subject and exam
  const getComponentConfig = (sub: Subject) => {
    let descriptive = 0;
    let practical = 0;
    let ia = 0;

    if (sub.componentsByExamType && sub.componentsByExamType[exam.examTypeId]) {
      const cfg = sub.componentsByExamType[exam.examTypeId];
      descriptive = cfg.descriptive || 0;
      practical = cfg.practical || 0;
      ia = cfg.ia || 0;
    } else if (sub.components) {
      descriptive = sub.components.descriptive || 0;
      practical = sub.components.practical || 0;
      ia = sub.components.ia || 0;
    } else {
      // Default: descriptive gets exam default or 100
      descriptive = sub.fullMarks || 100;
    }

    return { descriptive, practical, ia };
  };

  // Build sequential list of active input keys for Enter traversal & auto-focus
  const activeInputKeys: string[] = [];
  subjects.forEach((sub) => {
    if (sub.type === 'marks') {
      const cfg = getComponentConfig(sub);
      if (cfg.descriptive > 0) activeInputKeys.push(`${sub.id}_descriptive`);
      if (cfg.practical > 0) activeInputKeys.push(`${sub.id}_practical`);
      if (cfg.ia > 0) activeInputKeys.push(`${sub.id}_ia`);
    }
  });

  // Auto-focus first empty input on mount
  useEffect(() => {
    if (disabled) return;
    const firstEmptyKey = activeInputKeys.find((key) => {
      const [subId, comp] = key.split('_');
      const val = marksState[subId]?.[comp as 'descriptive' | 'practical' | 'ia'];
      return !val || val.trim() === '';
    });

    const targetKey = firstEmptyKey || activeInputKeys[0];
    if (targetKey && inputRefs.current[targetKey]) {
      inputRefs.current[targetKey]?.focus();
    }
  }, []);

  const handleNextInput = (currentKey: string) => {
    const currentIndex = activeInputKeys.indexOf(currentKey);
    if (currentIndex !== -1 && currentIndex + 1 < activeInputKeys.length) {
      const nextKey = activeInputKeys[currentIndex + 1];
      inputRefs.current[nextKey]?.focus();
      inputRefs.current[nextKey]?.select();
    }
  };

  // Check if subject row is completed
  const isRowComplete = (sub: Subject): boolean => {
    const val = marksState[sub.id];
    if (!val) return false;

    if (sub.type === 'grade') {
      return Boolean(val.grade && val.grade.trim() !== '');
    }

    const cfg = getComponentConfig(sub);
    if (cfg.descriptive > 0 && (!val.descriptive || val.descriptive.trim() === '')) {
      return false;
    }
    if (cfg.practical > 0 && (!val.practical || val.practical.trim() === '')) {
      return false;
    }
    if (cfg.ia > 0 && (!val.ia || val.ia.trim() === '')) {
      return false;
    }
    return true;
  };

  // Check if subject row is marked absent in all its active parts
  const isRowAbsent = (sub: Subject): boolean => {
    const val = marksState[sub.id];
    if (!val) return false;
    if (sub.type === 'grade') {
      return val.grade === 'ABSENT';
    }
    const cfg = getComponentConfig(sub);
    const checks: boolean[] = [];
    if (cfg.descriptive > 0) checks.push(val.descriptive?.trim().toUpperCase() === 'A');
    if (cfg.practical > 0) checks.push(val.practical?.trim().toUpperCase() === 'A');
    if (cfg.ia > 0) checks.push(val.ia?.trim().toUpperCase() === 'A');
    return checks.length > 0 && checks.every(Boolean);
  };

  // Compute Live Totals
  let totalObtained = 0;
  let totalFullMarks = 0;
  let scholasticCount = 0;

  subjects.forEach((sub) => {
    if (sub.type === 'grade') return; // Exclude grade-type from numerical marks total
    scholasticCount++;

    const cfg = getComponentConfig(sub);
    const val = marksState[sub.id] || { descriptive: '', practical: '', ia: '' };

    // Descriptive
    if (cfg.descriptive > 0) {
      totalFullMarks += cfg.descriptive;
      const v = val.descriptive.trim().toUpperCase();
      if (v !== '' && v !== 'A') {
        const num = parseFloat(v);
        if (!isNaN(num)) totalObtained += num;
      }
    }

    // Practical
    if (cfg.practical > 0) {
      totalFullMarks += cfg.practical;
      const v = val.practical.trim().toUpperCase();
      if (v !== '' && v !== 'A') {
        const num = parseFloat(v);
        if (!isNaN(num)) totalObtained += num;
      }
    }

    // IA
    if (cfg.ia > 0) {
      totalFullMarks += cfg.ia;
      const v = val.ia.trim().toUpperCase();
      if (v !== '' && v !== 'A') {
        const num = parseFloat(v);
        if (!isNaN(num)) totalObtained += num;
      }
    }
  });

  const percentage =
    totalFullMarks > 0 ? (totalObtained / totalFullMarks) * 100 : 0;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase tracking-wide border-b border-slate-200">
              <th className="py-3 px-4 text-left w-1/4 border-r border-slate-200">
                Subject Name
              </th>
              <th className="py-3 px-3 w-28 text-center border-r border-slate-200">
                Subject Code
              </th>
              <th className="py-3 px-4 w-1/4 text-center border-r border-slate-200">
                Descriptive (Theory)
              </th>
              <th className="py-3 px-4 w-1/5 text-center border-r border-slate-200">
                Practical
              </th>
              <th className="py-3 px-4 w-1/5 text-center">
                IA (Internal Assessment)
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-slate-800">
            {subjects.map((sub, idx) => {
              const cfg = getComponentConfig(sub);
              const vals = marksState[sub.id] || {
                descriptive: '',
                practical: '',
                ia: '',
              };
              const rowComplete = isRowComplete(sub);
              const rowAbsent = isRowAbsent(sub);

              return (
                <tr
                  key={sub.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    rowAbsent
                      ? 'bg-amber-50/40'
                      : rowComplete
                      ? 'bg-teal-50/20'
                      : idx % 2 === 0
                      ? 'bg-white'
                      : 'bg-slate-50/40'
                  }`}
                >
                  {/* Column 1: Subject Name */}
                  <td className="py-3 px-4 text-left font-bold text-slate-900 border-r border-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span>{sub.name}</span>
                        {sub.type === 'grade' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            <Award className="w-3 h-3 text-purple-600" />
                            Grade
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {rowAbsent ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Absent
                          </span>
                        ) : rowComplete ? (
                          <span title="Marks entered successfully">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  {/* Column 2: Subject Code */}
                  <td className="py-3 px-3 font-mono font-bold text-slate-700 border-r border-slate-200">
                    {sub.code ? (
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {sub.code}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">--</span>
                    )}
                  </td>

                  {/* If grade type subject, span all component columns */}
                  {sub.type === 'grade' ? (
                    <td colSpan={3} className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-xs font-semibold text-slate-600">
                          Select Grade:
                        </span>
                        <select
                          disabled={disabled}
                          value={vals.grade || ''}
                          onChange={(e) => onGradeChange(sub.id, e.target.value)}
                          className="px-3 py-1.5 rounded border border-slate-300 bg-white font-bold text-xs focus:ring-2 focus:ring-[#9333ea] focus:outline-hidden"
                        >
                          <option value="">-- Choose Grade --</option>
                          {ALLOWED_GRADES.map((g) => (
                            <option key={g} value={g}>
                              {g === 'ABSENT' ? 'A (Absent)' : `Grade ${g}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  ) : (
                    <>
                      {/* Column 3: Descriptive */}
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        {cfg.descriptive > 0 ? (
                          <MarksComponentInput
                            value={vals.descriptive}
                            maxMarks={cfg.descriptive}
                            componentLabel="Descriptive"
                            disabled={disabled}
                            inputRef={(el) => {
                              inputRefs.current[`${sub.id}_descriptive`] = el;
                            }}
                            onEnter={() => handleNextInput(`${sub.id}_descriptive`)}
                            onChange={(val) =>
                              onMarksChange(sub.id, 'descriptive', val)
                            }
                            hasError={Boolean(
                              validationErrors[`${sub.id}_descriptive`]
                            )}
                            errorMessage={
                              validationErrors[`${sub.id}_descriptive`]
                            }
                          />
                        ) : (
                          <span className="text-slate-400 font-bold uppercase select-none">
                            NA
                          </span>
                        )}
                      </td>

                      {/* Column 4: Practical */}
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        {cfg.practical > 0 ? (
                          <MarksComponentInput
                            value={vals.practical}
                            maxMarks={cfg.practical}
                            componentLabel="Practical"
                            disabled={disabled}
                            inputRef={(el) => {
                              inputRefs.current[`${sub.id}_practical`] = el;
                            }}
                            onEnter={() => handleNextInput(`${sub.id}_practical`)}
                            onChange={(val) =>
                              onMarksChange(sub.id, 'practical', val)
                            }
                            hasError={Boolean(
                              validationErrors[`${sub.id}_practical`]
                            )}
                            errorMessage={
                              validationErrors[`${sub.id}_practical`]
                            }
                          />
                        ) : (
                          <span className="text-slate-400 font-bold uppercase select-none">
                            NA
                          </span>
                        )}
                      </td>

                      {/* Column 5: IA */}
                      <td className="py-2.5 px-3">
                        {cfg.ia > 0 ? (
                          <MarksComponentInput
                            value={vals.ia}
                            maxMarks={cfg.ia}
                            componentLabel="IA"
                            disabled={disabled}
                            inputRef={(el) => {
                              inputRefs.current[`${sub.id}_ia`] = el;
                            }}
                            onEnter={() => handleNextInput(`${sub.id}_ia`)}
                            onChange={(val) => onMarksChange(sub.id, 'ia', val)}
                            hasError={Boolean(validationErrors[`${sub.id}_ia`])}
                            errorMessage={validationErrors[`${sub.id}_ia`]}
                          />
                        ) : (
                          <span className="text-slate-400 font-bold uppercase select-none">
                            NA
                          </span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>

          {/* Live Totals Row */}
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800 text-xs">
              <td
                colSpan={2}
                className="py-3 px-4 text-left font-black text-slate-900 border-r border-slate-200 uppercase tracking-wide"
              >
                Total Obtained / Full Marks
              </td>
              <td colSpan={3} className="py-3 px-4 text-center">
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                  <div>
                    <span className="text-slate-500 font-semibold mr-1">
                      Obtained:
                    </span>
                    <span className="font-mono font-black text-base text-[#0f766e]">
                      {totalObtained}
                    </span>
                  </div>

                  <span className="text-slate-300 font-light">|</span>

                  <div>
                    <span className="text-slate-500 font-semibold mr-1">
                      Full Marks:
                    </span>
                    <span className="font-mono font-black text-base text-slate-800">
                      {totalFullMarks}
                    </span>
                  </div>

                  <span className="text-slate-300 font-light">|</span>

                  <div>
                    <span className="text-slate-500 font-semibold mr-1">
                      Percentage:
                    </span>
                    <span className="font-mono font-black text-base text-purple-900">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
