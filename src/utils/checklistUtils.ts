import * as XLSX from 'xlsx';
import {
  Student,
  Subject,
  MarkRecord,
  ExamRecord,
  StudentExamStatusRecord,
  MarksStatus,
  MarkComponentType,
  SubjectExamComponentConfig,
} from '../types';
import { sortByRollNo } from './rollNoUtils';

export interface ComponentRowDef {
  key: MarkComponentType;
  label: string; // "Objective" | "Descriptive" | "Practical" | "IA"
}

export interface StudentChecklistRow {
  student: Student;
  serialNo: number;
  rollNo: string;
  name: string;
  fatherName: string;
  registrationNo: string;
  isAbsentAll: boolean;
  isCompleted: boolean;
  hasErrors: boolean;
  errorMessages: string[];
  totalObtained: number;
  totalFullMarks: number;
  percentage: number;
  subjectCells: Record<
    string,
    {
      totalObtained: number | null;
      totalFullMarks: number;
      isAbsent: boolean;
      isGrade: boolean;
      grade?: string;
      isPending: boolean;
      components: Record<
        MarkComponentType,
        {
          hasComponent: boolean;
          obtained: number | null;
          fullMarks: number;
          isAbsent: boolean;
          isGrade: boolean;
          grade?: string;
          isPending: boolean;
          isError: boolean;
          errorReason?: string;
          displayText: string;
        }
      >;
    }
  >;
}

export interface ChecklistData {
  exam: ExamRecord;
  students: StudentChecklistRow[];
  subjects: Subject[];
  activeComponents: ComponentRowDef[];
  stats: {
    totalEnrolled: number;
    completedCount: number;
    pendingCount: number;
    absentCount: number;
    discrepancyCount: number;
  };
}

/**
 * Resolves component configuration for a given subject in a specific exam
 */
export function getSubjectComponentConfig(
  subject: Subject,
  examTypeId: string
): SubjectExamComponentConfig {
  const specific = subject.componentsByExamType?.[examTypeId];
  if (specific && (specific.objective || specific.descriptive || specific.practical || specific.ia)) {
    return specific;
  }
  if (subject.components && (subject.components.objective || subject.components.descriptive || subject.components.practical || subject.components.ia)) {
    return subject.components;
  }
  // Default fallback for marks-type subjects: descriptive gets fullMarks
  if (subject.type === 'marks') {
    return { descriptive: subject.fullMarks };
  }
  return {};
}

/**
 * Determines which component rows (Objective, Descriptive, Practical, IA)
 * exist across all subjects for this class and exam stage.
 */
export function getComponentRows(
  classSubjects: Subject[],
  examTypeId: string
): ComponentRowDef[] {
  let hasObj = false;
  let hasDesc = false;
  let hasPrac = false;
  let hasIA = false;

  classSubjects.forEach((sub) => {
    if (sub.hidden) return;
    const cfg = getSubjectComponentConfig(sub, examTypeId);
    if (cfg.objective && cfg.objective > 0) hasObj = true;
    if (cfg.descriptive && cfg.descriptive > 0) hasDesc = true;
    if (cfg.practical && cfg.practical > 0) hasPrac = true;
    if (cfg.ia && cfg.ia > 0) hasIA = true;
  });

  // If no component is configured but subjects are marks type, default to Descriptive
  if (!hasObj && !hasDesc && !hasPrac && !hasIA && classSubjects.some((s) => s.type === 'marks')) {
    hasDesc = true;
  }

  const rows: ComponentRowDef[] = [];
  if (hasObj) rows.push({ key: 'objective', label: 'Objective' });
  if (hasDesc) rows.push({ key: 'descriptive', label: 'Descriptive' });
  if (hasPrac) rows.push({ key: 'practical', label: 'Practical' });
  if (hasIA) rows.push({ key: 'ia', label: 'IA' });

  return rows;
}

/**
 * Pure function to construct all checklist data for an examination
 */
export function buildChecklistData(
  exam: ExamRecord,
  studentsList: Student[],
  examStudentsMap: Record<string, string[]>,
  subjectsList: Subject[],
  marksList: MarkRecord[],
  studentExamStatuses: Record<string, StudentExamStatusRecord>,
  marksStatusMap: Record<string, MarksStatus>
): ChecklistData {
  const enrolledIds = examStudentsMap[exam.id];
  const enrolledStudents = sortByRollNo(
    studentsList.filter(
      (s) =>
        (enrolledIds
          ? enrolledIds.includes(s.id)
          : s.classId === exam.classId && s.academicYear === exam.academicYear) &&
        s.active !== false
    )
  );

  const classSubjects = subjectsList
    .filter((s) => s.classId === exam.classId && !s.hidden)
    .sort((a, b) => a.order - b.order);

  const activeComponents = getComponentRows(classSubjects, exam.examTypeId);

  let completedCount = 0;
  let absentCount = 0;
  let discrepancyCount = 0;

  const rows: StudentChecklistRow[] = enrolledStudents.map((student, idx) => {
    const studentStatusKey = `${exam.id}_${student.id}`;
    const examStatusRec = studentExamStatuses[studentStatusKey];
    const isAbsentAll = examStatusRec?.status === 'absent_all';
    const isCompleted = marksStatusMap[studentStatusKey] === 'completed';

    if (isCompleted) completedCount++;
    if (isAbsentAll) absentCount++;

    const studentMarks = marksList.filter(
      (m) => m.examId === exam.id && m.studentId === student.id
    );

    let totalObtained = 0;
    let totalFullMarks = 0;
    const errorMessages: string[] = [];

    const subjectCells: StudentChecklistRow['subjectCells'] = {};

    classSubjects.forEach((sub) => {
      const cfg = getSubjectComponentConfig(sub, exam.examTypeId);
      const isGradeSub = sub.type === 'grade';

      let subObtained = 0;
      let hasAnyEntered = false;
      let isSubAbsent = isAbsentAll;
      let subGrade = '';

      const compMap: Record<MarkComponentType, any> = {
        objective: {
          hasComponent: Boolean(cfg.objective && cfg.objective > 0),
          obtained: null,
          fullMarks: cfg.objective || 0,
          isAbsent: isAbsentAll,
          isGrade: false,
          isPending: true,
          isError: false,
          displayText: 'NA',
        },
        descriptive: {
          hasComponent: Boolean(cfg.descriptive && cfg.descriptive > 0),
          obtained: null,
          fullMarks: cfg.descriptive || (isGradeSub ? 0 : sub.fullMarks),
          isAbsent: isAbsentAll,
          isGrade: isGradeSub,
          isPending: true,
          isError: false,
          displayText: 'NA',
        },
        practical: {
          hasComponent: Boolean(cfg.practical && cfg.practical > 0),
          obtained: null,
          fullMarks: cfg.practical || 0,
          isAbsent: isAbsentAll,
          isGrade: false,
          isPending: true,
          isError: false,
          displayText: 'NA',
        },
        ia: {
          hasComponent: Boolean(cfg.ia && cfg.ia > 0),
          obtained: null,
          fullMarks: cfg.ia || 0,
          isAbsent: isAbsentAll,
          isGrade: false,
          isPending: true,
          isError: false,
          displayText: 'NA',
        },
      };

      // Populate each active component
      (['objective', 'descriptive', 'practical', 'ia'] as MarkComponentType[]).forEach(
        (cKey) => {
          const compInfo = compMap[cKey];
          if (!compInfo.hasComponent) {
            compInfo.displayText = 'NA';
            compInfo.isPending = false;
            return;
          }

          if (isAbsentAll) {
            compInfo.isAbsent = true;
            compInfo.displayText = 'A';
            compInfo.isPending = false;
            return;
          }

          // Find specific mark record for this subject & component
          const rec = studentMarks.find(
            (m) =>
              m.subjectId === sub.id &&
              (m.component === cKey || (!m.component && cKey === 'descriptive'))
          );

          if (!rec) {
            compInfo.isPending = true;
            compInfo.displayText = '-';
            return;
          }

          if (rec.absent) {
            compInfo.isAbsent = true;
            compInfo.displayText = 'A';
            compInfo.isPending = false;
            isSubAbsent = true;
            return;
          }

          if (isGradeSub) {
            compInfo.isGrade = true;
            compInfo.grade = rec.grade || 'B';
            compInfo.displayText = rec.grade || 'B';
            compInfo.isPending = false;
            subGrade = compInfo.displayText;
            return;
          }

          if (rec.obtained !== null && rec.obtained !== undefined) {
            const obt = Number(rec.obtained);
            compInfo.obtained = obt;
            compInfo.isPending = false;
            hasAnyEntered = true;

            // Check discrepancy: obtained > component max
            if (obt > compInfo.fullMarks) {
              compInfo.isError = true;
              compInfo.errorReason = `Marks (${obt}) exceed full marks (${compInfo.fullMarks})`;
              errorMessages.push(`${sub.name} [${cKey}]: ${compInfo.errorReason}`);
            }

            compInfo.displayText = `${obt} / ${compInfo.fullMarks}`;
            subObtained += obt;
          } else {
            compInfo.isPending = true;
            compInfo.displayText = '-';
          }
        }
      );

      // Check if subject counts towards composite score
      if (!isGradeSub && sub.includeInTotal !== false) {
        totalFullMarks += sub.fullMarks;
        if (!isAbsentAll && hasAnyEntered) {
          totalObtained += subObtained;
        }
      }

      subjectCells[sub.id] = {
        totalObtained: hasAnyEntered && !isSubAbsent ? subObtained : null,
        totalFullMarks: sub.fullMarks,
        isAbsent: isSubAbsent,
        isGrade: isGradeSub,
        grade: subGrade || undefined,
        isPending: !hasAnyEntered && !isSubAbsent,
        components: compMap,
      };
    });

    // Check student-level discrepancies (missing marks when not marked absent)
    if (!isAbsentAll && !isCompleted) {
      errorMessages.push('Marks entry incomplete for this candidate');
    }

    const hasErrors = errorMessages.length > 0;
    if (hasErrors) discrepancyCount++;

    const percentage =
      totalFullMarks > 0 ? Math.round((totalObtained / totalFullMarks) * 1000) / 10 : 0;

    return {
      student,
      serialNo: idx + 1,
      rollNo: student.rollNo || '--',
      name: student.name,
      fatherName: student.fatherName || 'N/A',
      registrationNo: student.registrationNo || 'N/A',
      isAbsentAll,
      isCompleted,
      hasErrors,
      errorMessages,
      totalObtained,
      totalFullMarks,
      percentage,
      subjectCells,
    };
  });

  return {
    exam,
    students: rows,
    subjects: classSubjects,
    activeComponents,
    stats: {
      totalEnrolled: enrolledStudents.length,
      completedCount,
      pendingCount: enrolledStudents.length - completedCount,
      absentCount,
      discrepancyCount,
    },
  };
}

/**
 * Exports compact or detailed checklist data to an Excel (.xlsx) file
 */
export function exportChecklistToExcel(checklistData: ChecklistData): void {
  const { exam, students, subjects, activeComponents } = checklistData;

  const headers = [
    'Sl No',
    'Roll No.',
    'Student Name',
    "Father's Name",
    'Registration No.',
  ];

  subjects.forEach((s) => {
    headers.push(`${s.name} (${s.fullMarks})`);
  });

  headers.push('Total Obtained', 'Total Full Marks', 'Percentage (%)', 'Status');

  const rows = students.map((st) => {
    const rowData: (string | number)[] = [
      st.serialNo,
      st.rollNo,
      st.name,
      st.fatherName,
      st.registrationNo,
    ];

    subjects.forEach((s) => {
      const cell = st.subjectCells[s.id];
      if (!cell) {
        rowData.push('NA');
      } else if (cell.isAbsent) {
        rowData.push('A');
      } else if (cell.isGrade) {
        rowData.push(cell.grade || 'Pass');
      } else if (cell.totalObtained !== null) {
        rowData.push(cell.totalObtained);
      } else {
        rowData.push('-');
      }
    });

    rowData.push(
      st.isAbsentAll ? 0 : st.totalObtained,
      st.totalFullMarks,
      st.isAbsentAll ? 0 : `${st.percentage}%`,
      st.isAbsentAll ? 'ABSENT' : st.isCompleted ? 'COMPLETED' : 'PENDING'
    );

    return rowData;
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Checklist');

  const fileName = `Checklist_${exam.className}_${exam.name.replace(/[^a-zA-Z0-9]/g, '_')}_${exam.academicYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
